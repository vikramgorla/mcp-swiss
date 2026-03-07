import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleTransport } from '../../src/modules/transport.js';
import { mockStations, mockConnections, mockStationboard } from '../fixtures/transport.js';

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(payload),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── search_stations ───────────────────────────────────────────────────────────

describe('search_stations', () => {
  it('returns slim station array', async () => {
    mockFetch(mockStations);
    const result = JSON.parse(await handleTransport('search_stations', { query: 'Bern' }));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Bern');
    expect(result[0].id).toBe('8507000');
    expect(result[0].lat).toBeDefined();
    expect(result[0].lon).toBeDefined();
  });

  it('returns empty array when no stations found', async () => {
    mockFetch({ stations: [] });
    const result = JSON.parse(await handleTransport('search_stations', { query: 'Nonexistent' }));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('passes query param correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockStations),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTransport('search_stations', { query: 'Zürich HB' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('query=');
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('query')).toBe('Zürich HB');
  });

  it('propagates network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(handleTransport('search_stations', { query: 'Bern' }))
      .rejects.toThrow('Network failure');
  });
});

// ── get_connections ───────────────────────────────────────────────────────────

describe('get_connections', () => {
  it('returns slim connections array', async () => {
    mockFetch(mockConnections);
    const result = JSON.parse(await handleTransport('get_connections', {
      from: 'Bern', to: 'Zürich HB',
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('Bern');
    expect(result[0].to).toBe('Zürich HB');
  });

  it('includes duration and sections', async () => {
    mockFetch(mockConnections);
    const result = JSON.parse(await handleTransport('get_connections', {
      from: 'Bern', to: 'Zürich HB',
    }));
    expect(result[0].duration).toBe('00d00:58:00');
    expect(result[0].sections).toHaveLength(1);
    expect(result[0].sections[0].line).toBe('IC1');
  });

  it('returns empty array when no connections', async () => {
    mockFetch({ connections: [] });
    const result = JSON.parse(await handleTransport('get_connections', {
      from: 'Nowhere', to: 'Somewhere',
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ── get_departures ────────────────────────────────────────────────────────────

describe('get_departures', () => {
  it('returns slim departures with station name', async () => {
    mockFetch(mockStationboard);
    const result = JSON.parse(await handleTransport('get_departures', { station: 'Bern' }));
    expect(result.station).toBe('Bern');
    expect(Array.isArray(result.departures)).toBe(true);
    expect(result.departures).toHaveLength(2);
  });

  it('departure entries have slim fields', async () => {
    mockFetch(mockStationboard);
    const result = JSON.parse(await handleTransport('get_departures', { station: 'Bern' }));
    const first = result.departures[0];
    expect(first.line).toBe('IC1');
    expect(first.to).toBe('Zürich HB');
    expect(first.departure).toBeDefined();
    expect(first.platform).toBe('3');
    expect(first.delay).toBe(0);
    // Should NOT have passList
    expect(first.passList).toBeUndefined();
  });

  it('passes type=departure to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockStationboard),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTransport('get_departures', { station: 'Bern' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=departure');
  });
});

// ── get_arrivals ──────────────────────────────────────────────────────────────

describe('get_arrivals', () => {
  it('returns slim arrivals array', async () => {
    mockFetch(mockStationboard);
    const result = JSON.parse(await handleTransport('get_arrivals', { station: 'Bern' }));
    expect(result).toHaveProperty('arrivals');
    expect(Array.isArray(result.arrivals)).toBe(true);
  });

  it('passes type=arrival to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockStationboard),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTransport('get_arrivals', { station: 'Bern' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=arrival');
  });

  it('station is string name', async () => {
    mockFetch(mockStationboard);
    const result = JSON.parse(await handleTransport('get_arrivals', { station: 'Bern' }));
    expect(result.station).toBe('Bern');
  });
});

// ── get_nearby_stations ───────────────────────────────────────────────────────

describe('get_nearby_stations', () => {
  it('returns slim station array', async () => {
    mockFetch(mockStations);
    const result = JSON.parse(await handleTransport('get_nearby_stations', {
      x: 7.439122, y: 46.948825,
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('lat');
  });

  it('passes coordinates to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockStations),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTransport('get_nearby_stations', { x: 7.44, y: 46.95 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('x=7.44');
    expect(calledUrl).toContain('y=46.95');
    expect(calledUrl).toContain('type=station');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleTransport('does_not_exist', {}))
      .rejects.toThrow('Unknown transport tool: does_not_exist');
  });
});
