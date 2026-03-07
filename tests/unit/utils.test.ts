import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildUrl, fetchJSON } from '../../src/utils/http.js';

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
  });
});
