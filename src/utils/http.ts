import { readFileSync } from "node:fs";
import { join } from "node:path";

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const VERSION = readVersion();
export const USER_AGENT = `mcp-swiss/${VERSION}`;

const envTimeout = Number(process.env.MCP_SWISS_TIMEOUT_MS);
export const DEFAULT_TIMEOUT_MS = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 30000;

export interface HttpOptions extends RequestInit {
  /** Per-call override of DEFAULT_TIMEOUT_MS for known-slow upstreams. */
  timeoutMs?: number;
  /** Extra attempts after a dropped connection (default 1). */
  retries?: number;
  /** Let the caller handle non-2xx responses instead of throwing (fetchBody only). */
  rawStatus?: boolean;
}

const RETRY_DELAY_MS = 400;

const RETRYABLE_CODES = [
  "UND_ERR_SOCKET",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ETIMEDOUT",
  "EAI_AGAIN",
];

/**
 * Connection-level failures worth one more try: some upstreams (notably
 * transport.opendata.ch under its per-IP rate limit) close the socket, either
 * before the headers or part-way through the body. Timeouts and HTTP error
 * statuses are not retried here.
 */
function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error) || err.name === "TimeoutError") return false;
  const cause = (err as { cause?: { code?: string } }).cause;
  if (RETRYABLE_CODES.includes(cause?.code ?? "")) return true;
  // undici reports a mid-body drop as TypeError: terminated
  return err.message === "terminated" || err.message === "fetch failed";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Statuses worth another attempt: rate limits and transient server faults. */
const RETRYABLE_STATUS = [429, 502, 503, 504];
const MAX_RETRY_AFTER_MS = 10_000;

/**
 * Honour Retry-After when the server sends one (seconds or an HTTP date),
 * capped so a long cool-off does not stall a tool call.
 */
function retryAfterMs(response: Response, fallback: number): number {
  const get = response.headers?.get;
  if (typeof get !== "function") return fallback;
  const header = get.call(response.headers, "retry-after");
  if (!header) return fallback;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  return Math.min(ms, MAX_RETRY_AFTER_MS);
}

/**
 * fetch() wrapper used by every module: sets the mcp-swiss User-Agent and
 * aborts after DEFAULT_TIMEOUT_MS (override with MCP_SWISS_TIMEOUT_MS) so a
 * hanging upstream API cannot stall a tool call forever. Every request is a
 * read-only GET/POST search, so a dropped connection is retried once.
 */
export async function httpFetch(url: string, options: HttpOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s — ${url}`, { cause: err });
      }
      lastError = err;
      if (attempt === retries || !isTransientNetworkError(err)) break;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * Fetch and read the body under one retry budget. A connection dropped while
 * the body streams fails at read time, not at fetch time, so retrying only
 * around fetch() would miss exactly the case this exists for.
 */
export async function fetchBody<T>(
  url: string,
  options: HttpOptions | undefined,
  read: (response: Response) => Promise<T>
): Promise<T> {
  const { retries = 1, ...rest } = options ?? {};
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await httpFetch(url, { ...rest, retries: 0 });

      // A rate limit is the upstream asking us to wait, not a failed call.
      if (RETRYABLE_STATUS.includes(response.status) && attempt < retries) {
        await sleep(retryAfterMs(response, RETRY_DELAY_MS * (attempt + 1)));
        lastError = new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
        continue;
      }
      if (!response.ok && !rest.rawStatus) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
      }
      return await read(response);
    } catch (err) {
      lastError = err;
      if (attempt === retries || !isTransientNetworkError(err)) break;
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

export async function fetchJSON<T>(url: string, options?: HttpOptions): Promise<T> {
  return fetchBody(
    url,
    {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options?.headers as Record<string, string> | undefined),
      },
    },
    (response) => response.json() as Promise<T>
  );
}

/** Same retry budget as fetchJSON, for the CSV/XML/text upstreams. */
export async function fetchText(url: string, options?: HttpOptions): Promise<string> {
  return fetchBody(url, options, (response) => response.text());
}

export function buildUrl(base: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
