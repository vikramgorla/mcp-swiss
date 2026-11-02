import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer as createHttpServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { join } from "node:path";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const VERSION = readVersion();

export interface HttpServerOptions {
  port: number;
  host: string;
  /** Builds a fresh MCP server for each session. */
  createMcpServer: () => Server;
  /** Optional bearer token required on /mcp (MCP_AUTH_TOKEN). */
  authToken?: string;
  /** Host headers accepted on /mcp; enables DNS-rebinding protection when set. */
  allowedHosts?: string[];
  /** Access-Control-Allow-Origin value for browser clients (MCP_CORS_ORIGIN). */
  corsOrigin?: string;
  /** Idle sessions are closed after this many ms (default 30 min). */
  sessionTtlMs?: number;
  /**
   * Hard limit on a session's age (default 8 h). An open event stream keeps a
   * session out of the idle sweep, so without this one client could hold a
   * slot — and with a small cap, the whole server — indefinitely.
   */
  sessionMaxLifetimeMs?: number;
  /** Maximum concurrent sessions before /mcp answers 429 (default 64). */
  maxSessions?: number;
  /** Include the session count in /health (default true; off for public binds). */
  exposeSessionCount?: boolean;
}

interface Session {
  transport: StreamableHTTPServerTransport;
  server: Server;
  lastSeen: number;
  startedAt: number;
  /** Open SSE streams; a session with one is never swept as idle. */
  openStreams: number;
}

const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_MAX_SESSIONS = 64;

class BodyTooLargeError extends Error {}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function rpcError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError(`Request body exceeds ${MAX_BODY_BYTES} bytes`);
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

function tokenMatches(header: string | undefined, token: string): boolean {
  // Hash both sides first: comparing raw buffers returns early on a length
  // mismatch, which leaks the token length.
  const presented = createHash("sha256").update(header?.replace(/^Bearer\s+/i, "") ?? "").digest();
  const expected = createHash("sha256").update(token).digest();
  return timingSafeEqual(presented, expected);
}

const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "::1"];

export function isLoopbackBind(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host);
}

/** Default Host allow-list when bound to loopback, so a local server can't be DNS-rebound. */
export function defaultAllowedHosts(host: string, port: number): string[] | undefined {
  if (!isLoopbackBind(host)) return undefined;
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
}

export interface PublicBindOptions {
  host: string;
  authToken?: string;
  allowedHosts?: string[];
}

/**
 * A server reachable from outside must have a token and a Host allow-list:
 * without them anyone can use it as a proxy onto the Swiss APIs, and the SDK's
 * DNS-rebinding protection is off. Returns the reasons it must not start.
 */
export function publicBindProblems({ host, authToken, allowedHosts }: PublicBindOptions): string[] {
  if (isLoopbackBind(host)) return [];
  const problems: string[] = [];
  if (!authToken) problems.push("MCP_AUTH_TOKEN is not set");
  if (!allowedHosts?.length) problems.push("MCP_ALLOWED_HOSTS is not set");
  return problems;
}

/**
 * Streamable HTTP transport (MCP spec 2025-03-26+). Stateful: one MCP server
 * per session, keyed by the Mcp-Session-Id header. Endpoints:
 *   POST/GET/DELETE /mcp  — MCP traffic
 *   GET /health           — liveness probe
 */
export function startHttpServer(opts: HttpServerOptions): Promise<HttpServer> {
  const sessions = new Map<string, Session>();
  /** Handshakes past the cap check but not yet registered. */
  let pending = 0;
  const ttl = opts.sessionTtlMs ?? 30 * 60_000;
  const maxLifetime = opts.sessionMaxLifetimeMs ?? 8 * 60 * 60_000;
  const maxSessions = opts.maxSessions ?? DEFAULT_MAX_SESSIONS;

  const closeSession = (id: string) => {
    const s = sessions.get(id);
    if (!s) return;
    sessions.delete(id);
    s.transport.close().catch(() => undefined);
    s.server.close().catch(() => undefined);
  };

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      const idle = s.openStreams === 0 && s.lastSeen < now - ttl;
      const tooOld = s.startedAt < now - maxLifetime;
      if (idle || tooOld) closeSession(id);
    }
  }, Math.min(ttl, maxLifetime, 60_000));
  sweeper.unref();

  const handleMcp = async (req: IncomingMessage, res: ServerResponse) => {
    if (opts.authToken && !tokenMatches(req.headers.authorization, opts.authToken)) {
      res.setHeader("WWW-Authenticate", "Bearer");
      return rpcError(res, 401, "Unauthorized");
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const body = req.method === "POST" ? await readJsonBody(req) : undefined;

    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session) return rpcError(res, 404, "Session not found");
      session.lastSeen = Date.now();
      if (req.method === "GET") {
        // Long-lived SSE stream: keep the session out of the idle sweep.
        session.openStreams += 1;
        res.on("close", () => {
          session.openStreams = Math.max(0, session.openStreams - 1);
          session.lastSeen = Date.now();
        });
      }
      return session.transport.handleRequest(req, res, body);
    }

    if (req.method !== "POST" || !isInitializeRequest(body)) {
      return rpcError(res, 400, "Bad Request: no valid session ID provided");
    }

    // Reserve the slot before building anything: two concurrent initializes
    // would otherwise both pass a `sessions.size` check and overshoot the cap.
    if (pending + sessions.size >= maxSessions) {
      res.setHeader("Retry-After", "60");
      return rpcError(res, 429, `Too many sessions (limit ${maxSessions}); retry later`);
    }
    pending += 1;

    let server: Server;
    let transport: StreamableHTTPServerTransport;
    try {
      server = opts.createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableDnsRebindingProtection: Boolean(opts.allowedHosts?.length),
        allowedHosts: opts.allowedHosts,
        onsessioninitialized: (id) => {
          const now = Date.now();
          sessions.set(id, { transport, server, lastSeen: now, startedAt: now, openStreams: 0 });
        },
        onsessionclosed: (id) => closeSession(id),
      });
    } catch (err) {
      pending -= 1;
      throw err;
    }

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } finally {
      pending -= 1;
      // A handshake that never reached onsessioninitialized leaves an orphan
      // server holding memory that nothing would ever sweep.
      if (!transport.sessionId || !sessions.has(transport.sessionId)) {
        await transport.close().catch(() => undefined);
        await server.close().catch(() => undefined);
      }
    }
  };

  const httpServer = createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (opts.corsOrigin) {
      res.setHeader("Access-Control-Allow-Origin", opts.corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
      if (req.method === "OPTIONS") {
        res.writeHead(204).end();
        return;
      }
    }

    if (url.pathname === "/health" && req.method === "GET") {
      // Session count only on loopback: on a public bind it is a free DoS gauge.
      const body: Record<string, unknown> = { status: "ok", version: VERSION };
      if (opts.exposeSessionCount ?? true) body.sessions = sessions.size;
      return sendJson(res, 200, body);
    }

    if (url.pathname === "/mcp") {
      handleMcp(req, res).catch((err: unknown) => {
        if (res.headersSent) return;
        if (err instanceof BodyTooLargeError) return rpcError(res, 413, err.message);
        if (err instanceof SyntaxError) return rpcError(res, 400, "Invalid JSON in request body");
        process.stderr.write(`/mcp error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
        rpcError(res, 500, "Internal server error");
      });
      return;
    }

    sendJson(res, 404, { error: "Not found. MCP endpoint is /mcp" });
  });

  httpServer.on("close", () => {
    clearInterval(sweeper);
    for (const id of [...sessions.keys()]) closeSession(id);
  });

  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(opts.port, opts.host, () => resolve(httpServer));
  });
}
