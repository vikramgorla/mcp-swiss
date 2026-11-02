import { describe, it, expect, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import { request as httpRequest, type Server as HttpServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";

import {
  startHttpServer,
  defaultAllowedHosts,
  publicBindProblems,
  VERSION,
  type HttpServerOptions,
} from "../../src/http-server.js";
import { createServer } from "../../src/server.js";
import { holidaysTools, handleHolidays } from "../../src/modules/holidays.js";

const holidaysModule = {
  name: "holidays",
  tools: holidaysTools,
  handler: handleHolidays,
};

let httpServer: HttpServer | undefined;

afterEach(async () => {
  if (httpServer) {
    httpServer.closeAllConnections();
    await new Promise((r) => httpServer!.close(r));
    httpServer = undefined;
  }
});

async function start(extra: Partial<HttpServerOptions> = {}) {
  httpServer = await startHttpServer({
    port: 0,
    host: "127.0.0.1",
    createMcpServer: () => createServer({ version: VERSION, modules: [holidaysModule] }),
    ...extra,
  });
  const { port } = httpServer.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function connectClient(base: string, headers: Record<string, string> = {}) {
  const client = new Client({ name: "test", version: "0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers } });
  await client.connect(transport);
  return { client, transport };
}

const initBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "raw", version: "0" } },
});
const mcpHeaders = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
const listToolsBody = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });

/** Raw JSON-RPC POST; the transport answers requests as a one-shot SSE stream. */
async function post(base: string, body: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}/mcp`, { method: "POST", headers: { ...mcpHeaders, ...headers }, body });
  const raw = await res.text();
  const data = raw.split("\n").find((line) => line.startsWith("data: "));
  return { status: res.status, headers: res.headers, message: data ? JSON.parse(data.slice(6)) : undefined };
}

/** initialize + notifications/initialized without the SDK client, returning the session id. */
async function openSession(base: string, headers: Record<string, string> = {}) {
  const init = await post(base, initBody, headers);
  const sessionId = init.headers.get("mcp-session-id");
  expect(sessionId).toBeTruthy();
  await post(base, JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), {
    ...headers,
    "Mcp-Session-Id": sessionId!,
  });
  return sessionId!;
}

/** fetch() forbids a custom Host header, so DNS-rebinding cases go through node:http. */
function postWithHost(port: number, host: string, body: string) {
  return new Promise<{ status: number; body: string }>((resolveResult, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        path: "/mcp",
        method: "POST",
        headers: { ...mcpHeaders, Host: host, "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => (raw += chunk));
        res.on("end", () => resolveResult({ status: res.statusCode ?? 0, body: raw }));
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function sessionCount(base: string): Promise<number> {
  return (await (await fetch(`${base}/health`)).json()).sessions;
}

describe("HTTP transport", () => {
  it("serves /health", async () => {
    const base = await start();
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", version: VERSION, sessions: 0 });
  });

  it("returns 404 for unknown paths", async () => {
    const base = await start();
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });

  it("runs a full MCP session with the SDK client", async () => {
    const base = await start();
    const { client, transport } = await connectClient(base);
    expect(transport.sessionId).toBeTruthy();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("is_holiday_today");

    expect(await sessionCount(base)).toBe(1);

    await transport.terminateSession();
    expect(await sessionCount(base)).toBe(0);
  });

  it("gives each session its own server", async () => {
    let built = 0;
    const base = await start({
      createMcpServer: () => {
        built += 1;
        return createServer({ version: VERSION, modules: [holidaysModule] });
      },
    });
    const a = await connectClient(base);
    const b = await connectClient(base);
    expect(a.transport.sessionId).not.toBe(b.transport.sessionId);
    expect(built).toBe(2);
    expect((await a.client.listTools()).tools.map((t) => t.name)).toContain("is_holiday_today");
    expect((await b.client.listTools()).tools.map((t) => t.name)).toContain("is_holiday_today");
    await a.transport.close();
    await b.transport.close();
  });

  it("rejects requests without a session id", async () => {
    const base = await start();
    expect((await post(base, listToolsBody)).status).toBe(400);
    const get = await fetch(`${base}/mcp`, { headers: { Accept: "text/event-stream" } });
    expect(get.status).toBe(400);
    expect((await fetch(`${base}/mcp`, { method: "DELETE" })).status).toBe(400);
  });

  it("returns 404 for an unknown session id on every method", async () => {
    const base = await start();
    const unknown = { "Mcp-Session-Id": "does-not-exist" };
    expect((await post(base, listToolsBody, unknown)).status).toBe(404);
    expect((await fetch(`${base}/mcp`, { headers: { Accept: "text/event-stream", ...unknown } })).status).toBe(404);
    expect((await fetch(`${base}/mcp`, { method: "DELETE", headers: unknown })).status).toBe(404);
  });

  it("opens an event stream on GET and stops sweeping the session while it is open", async () => {
    const base = await start({ sessionTtlMs: 50 });
    const sessionId = await openSession(base);

    const abort = new AbortController();
    const stream = await fetch(`${base}/mcp`, {
      headers: { Accept: "text/event-stream", "Mcp-Session-Id": sessionId },
      signal: abort.signal,
    });
    expect(stream.status).toBe(200);
    expect(stream.headers.get("content-type")).toContain("text/event-stream");

    await new Promise((r) => setTimeout(r, 200));
    expect(await sessionCount(base)).toBe(1);

    // Once the stream drops, the session becomes idle again and is swept.
    abort.abort();
    await new Promise((r) => setTimeout(r, 300));
    expect(await sessionCount(base)).toBe(0);
  });

  it("ends a session on DELETE", async () => {
    const base = await start();
    const sessionId = await openSession(base);
    expect(await sessionCount(base)).toBe(1);

    const res = await fetch(`${base}/mcp`, { method: "DELETE", headers: { "Mcp-Session-Id": sessionId } });
    expect(res.status).toBe(200);
    expect(await sessionCount(base)).toBe(0);
    expect((await post(base, listToolsBody, { "Mcp-Session-Id": sessionId })).status).toBe(404);
  });

  it("validates Mcp-Protocol-Version, but resolves the session first", async () => {
    const base = await start();
    const sessionId = await openSession(base);

    const bad = await post(base, listToolsBody, {
      "Mcp-Session-Id": sessionId,
      "Mcp-Protocol-Version": "1999-01-01",
    });
    expect(bad.status).toBe(400);

    // An unknown session is ours to reject before the transport sees the header.
    const unknown = await post(base, listToolsBody, {
      "Mcp-Session-Id": "does-not-exist",
      "Mcp-Protocol-Version": "1999-01-01",
    });
    expect(unknown.status).toBe(404);

    const current = await post(base, listToolsBody, {
      "Mcp-Session-Id": sessionId,
      "Mcp-Protocol-Version": LATEST_PROTOCOL_VERSION,
    });
    expect(current.status).toBe(200);
    expect(current.message.result.tools.map((t: { name: string }) => t.name)).toContain("is_holiday_today");

    // Omitting the header is allowed for clients predating it.
    const omitted = await post(base, listToolsBody, { "Mcp-Session-Id": sessionId });
    expect(omitted.status).toBe(200);
  });

  it("returns 400 on malformed JSON", async () => {
    const base = await start();
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: "{not json" });
    expect(res.status).toBe(400);
  });

  it("requires the bearer token when configured", async () => {
    const base = await start({ authToken: "s3cret" });
    const denied = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
    expect(denied.status).toBe(401);
    expect(denied.headers.get("www-authenticate")).toBe("Bearer");

    const wrong = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...mcpHeaders, Authorization: "Bearer nope" },
      body: initBody,
    });
    expect(wrong.status).toBe(401);
    // A prefix of the secret must not pass either.
    const short = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...mcpHeaders, Authorization: "Bearer s3c" },
      body: initBody,
    });
    expect(short.status).toBe(401);

    const { client } = await connectClient(base, { Authorization: "Bearer s3cret" });
    expect((await client.listTools()).tools.length).toBeGreaterThan(0);
  });

  it("requires the bearer token on GET and DELETE too", async () => {
    const base = await start({ authToken: "s3cret" });
    const auth = { Authorization: "Bearer s3cret" };
    const sessionId = await openSession(base, auth);

    expect((await fetch(`${base}/mcp`, { headers: { Accept: "text/event-stream", "Mcp-Session-Id": sessionId } })).status).toBe(401);
    expect((await fetch(`${base}/mcp`, { method: "DELETE", headers: { "Mcp-Session-Id": sessionId } })).status).toBe(401);
    // An unauthenticated DELETE must not have closed it.
    expect(await sessionCount(base)).toBe(1);

    const ok = await fetch(`${base}/mcp`, { method: "DELETE", headers: { ...auth, "Mcp-Session-Id": sessionId } });
    expect(ok.status).toBe(200);
    expect(await sessionCount(base)).toBe(0);
  });

  it("matches the Host header against the allow-list", async () => {
    const base = await start({ allowedHosts: ["mcp.example.ch"] });
    const { port } = httpServer!.address() as AddressInfo;

    const allowed = await postWithHost(port, "mcp.example.ch", initBody);
    expect(allowed.status).toBe(200);

    const foreign = await postWithHost(port, "evil.example", initBody);
    expect(foreign.status).toBe(403);
    // 127.0.0.1:<port>, i.e. what a plain fetch sends, is not on the list.
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
    expect(res.status).toBe(403);
  });

  it("answers CORS preflight when an origin is configured", async () => {
    const base = await start({ corsOrigin: "https://inspector.example" });
    const res = await fetch(`${base}/mcp`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://inspector.example");
    expect(res.headers.get("access-control-expose-headers")).toContain("Mcp-Session-Id");
  });

  it("expires idle sessions and refuses them afterwards", async () => {
    const base = await start({ sessionTtlMs: 50 });
    const sessionId = await openSession(base);
    expect(await sessionCount(base)).toBe(1);
    await new Promise((r) => setTimeout(r, 250));
    expect(await sessionCount(base)).toBe(0);
    expect((await post(base, listToolsBody, { "Mcp-Session-Id": sessionId })).status).toBe(404);
  });

  it("keeps an SDK client's session alive past the TTL and usable", async () => {
    const base = await start({ sessionTtlMs: 50 });
    const { client } = await connectClient(base); // the SDK client holds a GET stream
    await new Promise((r) => setTimeout(r, 250));
    expect(await sessionCount(base)).toBe(1);
    // still usable, i.e. the sweeper did not close it underneath us
    expect((await client.listTools()).tools.length).toBeGreaterThan(0);
  });

  it("closes a streaming session once it hits the maximum lifetime", async () => {
    const base = await start({ sessionTtlMs: 60_000, sessionMaxLifetimeMs: 120 });
    const { transport } = await connectClient(base); // holds a GET stream open
    expect((await (await fetch(`${base}/health`)).json()).sessions).toBe(1);

    await new Promise((r) => setTimeout(r, 300));
    expect((await (await fetch(`${base}/health`)).json()).sessions).toBe(0);
    await transport.close().catch(() => undefined);
  });

  it("frees the reserved slot when the server factory throws", async () => {
    let fail = true;
    const base = await start({
      maxSessions: 2,
      createMcpServer: () => {
        if (fail) throw new Error("factory exploded");
        return createServer({ version: VERSION, modules: [holidaysModule] });
      },
    });

    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
      expect(res.status).toBe(500);
      await res.text();
    }
    expect((await (await fetch(`${base}/health`)).json()).sessions).toBe(0);

    // Without releasing the slot, the cap would now be permanently full.
    fail = false;
    const ok = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
    expect(ok.status).toBe(200);
    await ok.text();
  });

  it("caps concurrent sessions with 429 + Retry-After", async () => {
    const base = await start({ maxSessions: 2 });
    for (let i = 0; i < 2; i++) {
      const ok = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
      expect(ok.status).toBe(200);
      await ok.text();
    }
    const denied = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
    expect(denied.status).toBe(429);
    expect(denied.headers.get("retry-after")).toBe("60");
    expect(await sessionCount(base)).toBe(2);
  });

  it("keeps the cap under concurrent initializes", async () => {
    const base = await start({ maxSessions: 3 });
    const attempts = Array.from({ length: 12 }, () =>
      fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody })
    );
    const results = await Promise.all(attempts);
    await Promise.all(results.map((r) => r.text()));

    const accepted = results.filter((r) => r.status === 200).length;
    const rejected = results.filter((r) => r.status === 429).length;
    expect(accepted).toBe(3);
    expect(rejected).toBe(9);
    expect((await (await fetch(`${base}/health`)).json()).sessions).toBe(3);
  });

  it("does not count or strand a handshake that never completes", async () => {
    const base = await start({ maxSessions: 2 });
    // An initialize the SDK rejects: no session is created, and the slot must
    // be released rather than held by an orphaned server.
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // missing the SSE Accept
        body: initBody,
      });
      await res.text();
    }
    expect((await (await fetch(`${base}/health`)).json()).sessions).toBe(0);

    // The cap is still fully available afterwards.
    const ok = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
    expect(ok.status).toBe(200);
    await ok.text();
  });

  it("rejects a token of the wrong length without leaking it", async () => {
    const base = await start({ authToken: "correct-horse-battery-staple" });
    for (const attempt of ["", "short", "correct-horse-battery-stapl", "correct-horse-battery-staplee"]) {
      const res = await fetch(`${base}/mcp`, {
        method: "POST",
        headers: { ...mcpHeaders, Authorization: `Bearer ${attempt}` },
        body: initBody,
      });
      expect(res.status).toBe(401);
      await res.text();
    }
  });

  it("returns 413 for an oversized body", async () => {
    const base = await start();
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: mcpHeaders,
      body: "x".repeat(1_100_000),
    });
    expect(res.status).toBe(413);
  });

  it("hides internal errors behind a generic 500", async () => {
    const base = await start({
      createMcpServer: () => {
        throw new Error("secret internal detail");
      },
    });
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: mcpHeaders, body: initBody });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret internal detail");
  });

  it("omits the session count from /health when asked", async () => {
    const base = await start({ exposeSessionCount: false });
    expect(await (await fetch(`${base}/health`)).json()).toEqual({ status: "ok", version: VERSION });
  });
});

describe("publicBindProblems", () => {
  it("allows a loopback bind with no token or allow-list", () => {
    expect(publicBindProblems({ host: "127.0.0.1" })).toEqual([]);
    expect(publicBindProblems({ host: "localhost" })).toEqual([]);
  });

  it("requires a token and an allow-list on a public bind", () => {
    expect(publicBindProblems({ host: "0.0.0.0" })).toEqual([
      "MCP_AUTH_TOKEN is not set",
      "MCP_ALLOWED_HOSTS is not set",
    ]);
    expect(publicBindProblems({ host: "0.0.0.0", authToken: "t" })).toEqual([
      "MCP_ALLOWED_HOSTS is not set",
    ]);
    expect(publicBindProblems({ host: "0.0.0.0", authToken: "t", allowedHosts: [] })).toEqual([
      "MCP_ALLOWED_HOSTS is not set",
    ]);
    expect(
      publicBindProblems({ host: "0.0.0.0", authToken: "t", allowedHosts: ["mcp.example.ch:3000"] })
    ).toEqual([]);
  });
});

describe("defaultAllowedHosts", () => {
  it("locks loopback binds to loopback Host headers", () => {
    expect(defaultAllowedHosts("127.0.0.1", 3000)).toEqual([
      "127.0.0.1:3000",
      "localhost:3000",
      "[::1]:3000",
    ]);
  });

  it("returns undefined for public binds (configure MCP_ALLOWED_HOSTS instead)", () => {
    expect(defaultAllowedHosts("0.0.0.0", 3000)).toBeUndefined();
  });
});
