import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildUrl, fetchJSON, httpFetch, USER_AGENT, VERSION } from '../../src/utils/http.js';
import { cached } from '../../src/utils/cache.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── buildUrl ──────────────────────────────────────────────────────────────────

describe('buildUrl', () => {
  it('returns base URL unchanged when no params', () => {
    const url = buildUrl('https://example.com/api', {});
    expect(url).toBe('https://example.com/api');
  });

  it('appends string param', () => {
    const url = buildUrl('https://example.com/api', { query: 'Bern' });
    expect(url).toContain('query=Bern');
  });

  it('appends numeric param', () => {
    const url = buildUrl('https://example.com/api', { limit: 10 });
    expect(url).toContain('limit=10');
  });

  it('skips undefined values', () => {
    const url = buildUrl('https://example.com/api', { a: 'yes', b: undefined });
    expect(url).toContain('a=yes');
    expect(url).not.toContain('b=');
  });

  it('skips empty string values', () => {
    const url = buildUrl('https://example.com/api', { a: 'x', b: '' });
    expect(url).not.toContain('b=');
  });

  it('encodes special characters', () => {
    const url = buildUrl('https://example.com/api', { name: 'Zürich HB' });
    // URL encoding: ü → %C3%BC, space → +/%20
    expect(url).toContain('name=');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('name')).toBe('Zürich HB');
  });

  it('appends multiple params', () => {
    const url = buildUrl('https://example.com/api', {
      from: 'Bern',
      to: 'Zürich',
      limit: 4,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('from')).toBe('Bern');
    expect(parsed.searchParams.get('to')).toBe('Zürich');
    expect(parsed.searchParams.get('limit')).toBe('4');
  });

  it('handles boolean params', () => {
    const url = buildUrl('https://example.com/api', { flag: true });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('flag')).toBe('true');
  });
});

// ── fetchJSON ─────────────────────────────────────────────────────────────────

describe('fetchJSON', () => {
  it('returns parsed JSON on 200', async () => {
    const payload = { hello: 'world', count: 42 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    }));

    const result = await fetchJSON('https://example.com/api');
    expect(result).toEqual(payload);
  });

  it('throws on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({}),
    }));

    await expect(fetchJSON('https://example.com/missing')).rejects.toThrow('HTTP 404');
  });

  it('throws on 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    }));

    await expect(fetchJSON('https://example.com/error')).rejects.toThrow('HTTP 500');
  });

  it('throws on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    await expect(fetchJSON('https://example.com/api')).rejects.toThrow('Network error');
  });

  it('includes URL in error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: () => Promise.resolve({}),
    }));

    await expect(fetchJSON('https://example.com/myendpoint'))
      .rejects.toThrow('https://example.com/myendpoint');
  });

  it('passes custom request options', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchJSON('https://example.com/api', {
      method: 'POST',
      headers: { 'X-Custom': 'header' },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['X-Custom']).toBe('header');
    expect(opts.headers['Accept']).toBe('application/json');
    expect(opts.headers['User-Agent']).toBe(USER_AGENT);
  });
});

describe('fetchJSON retry over a real connection', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      const s = server;
      server = undefined;
      await new Promise((r) => s.close(r));
    }
  });

  async function serve(handler: (attempt: number, res: import('node:http').ServerResponse) => void) {
    let attempt = 0;
    server = createServer((_req, res) => handler(++attempt, res));
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
    const { port } = server!.address() as AddressInfo;
    return { url: `http://127.0.0.1:${port}/`, attempts: () => attempt };
  }

  it('retries a connection dropped part-way through the body', async () => {
    const { url, attempts } = await serve((attempt, res) => {
      if (attempt === 1) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '40' });
        res.write('{"partial":');
        res.socket?.destroy();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });

    await expect(fetchJSON(url)).resolves.toEqual({ ok: true });
    expect(attempts()).toBe(2);
  });

  it('retries a connection dropped before the headers', async () => {
    const { url, attempts } = await serve((attempt, res) => {
      if (attempt === 1) {
        res.socket?.destroy();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });

    await expect(fetchJSON(url)).resolves.toEqual({ ok: true });
    expect(attempts()).toBe(2);
  });

  it('retries a 429 and honours Retry-After', async () => {
    const { url, attempts } = await serve((attempt, res) => {
      if (attempt === 1) {
        res.writeHead(429, { 'Retry-After': '0' });
        res.end('slow down');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });

    await expect(fetchJSON(url)).resolves.toEqual({ ok: true });
    expect(attempts()).toBe(2);
  });

  it('gives up on a persistent 429 with the status in the message', async () => {
    const { url, attempts } = await serve((_attempt, res) => {
      res.writeHead(429, { 'Retry-After': '0' });
      res.end('slow down');
    });

    await expect(fetchJSON(url)).rejects.toThrow('HTTP 429');
    expect(attempts()).toBe(2);
  });

  it('caps a long Retry-After rather than stalling the call', async () => {
    const { url } = await serve((attempt, res) => {
      if (attempt === 1) {
        res.writeHead(503, { 'Retry-After': '3600' });
        res.end('maintenance');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });

    const started = Date.now();
    await expect(fetchJSON(url)).resolves.toEqual({ ok: true });
    expect(Date.now() - started).toBeLessThan(12_000);
  }, 20_000);

  it('does not retry a 500', async () => {
    const { url, attempts } = await serve((_attempt, res) => {
      res.writeHead(500);
      res.end('nope');
    });

    await expect(fetchJSON(url)).rejects.toThrow('HTTP 500');
    expect(attempts()).toBe(1);
  });
});

describe('httpFetch', () => {
  it('sends the versioned User-Agent and a timeout signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await httpFetch('https://example.com/api', { headers: { Accept: 'text/plain' } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe(USER_AGENT);
    expect(headers.Accept).toBe('text/plain');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('derives the User-Agent from package.json', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(USER_AGENT).toBe(`mcp-swiss/${VERSION}`);
  });

  it('honours a per-call timeoutMs and does not forward it to fetch', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(httpFetch('https://example.com/slow', { timeoutMs: 120_000 })).rejects.toThrow('timed out after 120s');
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('timeoutMs');
  });

  it('retries once after a dropped connection', async () => {
    const dropped = Object.assign(new TypeError('fetch failed'), {
      cause: { code: 'UND_ERR_SOCKET' },
    });
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(dropped)
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const res = await httpFetch('https://example.com/flaky');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured retries', async () => {
    const dropped = Object.assign(new TypeError('fetch failed'), {
      cause: { code: 'ECONNRESET' },
    });
    const fetchMock = vi.fn().mockRejectedValue(dropped);
    vi.stubGlobal('fetch', fetchMock);

    await expect(httpFetch('https://example.com/down')).rejects.toThrow('fetch failed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a plain HTTP error or a timeout', async () => {
    const notFound = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', notFound);
    await expect(fetchJSON('https://example.com/missing')).rejects.toThrow('HTTP 404');
    expect(notFound).toHaveBeenCalledTimes(1);

    const timedOut = vi.fn().mockRejectedValue(new DOMException('slow', 'TimeoutError'));
    vi.stubGlobal('fetch', timedOut);
    await expect(httpFetch('https://example.com/slow')).rejects.toThrow('timed out');
    expect(timedOut).toHaveBeenCalledTimes(1);
  });

  it('turns an abort timeout into a readable error', async () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));

    await expect(httpFetch('https://example.com/slow')).rejects.toThrow(/timed out after .* https:\/\/example\.com\/slow/);
  });
});

describe('cached', () => {
  it('loads once and serves the same value', async () => {
    const load = vi.fn().mockResolvedValue('v1');
    const value = cached(1000, load);
    expect(await value.get()).toBe('v1');
    expect(await value.get()).toBe('v1');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('concurrent callers share one load', async () => {
    let release!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => { release = resolve; }));
    const value = cached(1000, load);
    const all = Promise.all([value.get(), value.get(), value.get()]);
    release('v1');
    expect(await all).toEqual(['v1', 'v1', 'v1']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads once the TTL has passed', async () => {
    vi.useFakeTimers();
    try {
      const load = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
      const value = cached(1000, load);
      expect(await value.get()).toBe('v1');
      vi.advanceTimersByTime(1001);
      expect(await value.get()).toBe('v2');
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not cache a rejection', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('v1');
    const value = cached(1000, load);
    await expect(value.get()).rejects.toThrow('boom');
    expect(await value.get()).toBe('v1');
  });

  it('clear() forces the next get to reload', async () => {
    const load = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    const value = cached(60_000, load);
    expect(await value.get()).toBe('v1');
    value.clear();
    expect(await value.get()).toBe('v2');
  });
});
