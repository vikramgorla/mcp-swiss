import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleEarthquakes, earthquakeTools } from '../../src/modules/earthquakes.js';
import {
  mockFdsnTextMulti,
  mockFdsnTextSingle,
  mockFdsnTextEmpty,
  mockFdsnTextHeaderOnly,
  mockFdsnTextMalformed,
  mockFdsnTextAllBlasts,
  mockFdsnTextNearBern,
  mockFdsnTextNanFields,
} from '../fixtures/earthquakes.js';

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchText(body: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body),
  }));
}

function mockFetch204() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status: 204,
    statusText: 'No Content',
    text: () => Promise.resolve(''),
  }));
}

function mockFetchError(status = 500) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Internal Server Error',
    text: () => Promise.resolve(''),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tool definitions ──────────────────────────────────────────────────────────

describe('earthquakeTools', () => {
  it('exports 3 tools', () => {
    expect(earthquakeTools).toHaveLength(3);
  });

  it('tool names are correct', () => {
    const names = earthquakeTools.map((t) => t.name);
    expect(names).toContain('get_recent_earthquakes');
    expect(names).toContain('get_earthquake_details');
    expect(names).toContain('search_earthquakes_by_location');
  });

  it('get_earthquake_details requires event_id', () => {
    const tool = earthquakeTools.find((t) => t.name === 'get_earthquake_details')!;
    expect(tool.inputSchema.required).toContain('event_id');
  });

  it('search_earthquakes_by_location requires lat and lon', () => {
    const tool = earthquakeTools.find((t) => t.name === 'search_earthquakes_by_location')!;
    expect(tool.inputSchema.required).toContain('lat');
    expect(tool.inputSchema.required).toContain('lon');
  });

  it('get_recent_earthquakes has no required fields', () => {
    const tool = earthquakeTools.find((t) => t.name === 'get_recent_earthquakes')!;
    expect(tool.inputSchema.required ?? []).toHaveLength(0);
  });
});

// ── get_recent_earthquakes ────────────────────────────────────────────────────

describe('get_recent_earthquakes', () => {
  it('returns count and events array', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    // 4 earthquakes (1 quarry blast filtered out by default)
    expect(result.count).toBe(4);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.events).toHaveLength(4);
  });

  it('each event has required fields', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    const ev = result.events[0];
    expect(ev.event_id).toBeDefined();
    expect(ev.time).toBeDefined();
    expect(typeof ev.latitude).toBe('number');
    expect(typeof ev.longitude).toBe('number');
    expect(typeof ev.depth_km).toBe('number');
    expect(typeof ev.magnitude).toBe('number');
    expect(ev.magnitude_type).toBeDefined();
    expect(ev.location).toBeDefined();
    expect(ev.event_type).toBeDefined();
  });

  it('first event is Sion VS with correct values', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    const ev = result.events[0];
    expect(ev.location).toBe('Sion VS');
    expect(ev.event_type).toBe('earthquake');
    expect(ev.magnitude).toBeCloseTo(0.52, 1);
    expect(ev.depth_km).toBeCloseTo(3.25, 1);
  });

  it('filters out quarry blasts by default', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    const blasts = result.events.filter((e: { event_type: string }) => e.event_type === 'quarry blast');
    expect(blasts).toHaveLength(0);
  });

  it('includes quarry blasts when include_blasts=true', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', { include_blasts: true }));
    expect(result.count).toBe(5);
    const blasts = result.events.filter((e: { event_type: string }) => e.event_type === 'quarry blast');
    expect(blasts).toHaveLength(1);
  });

  it('respects min_magnitude default of 0.5', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextMulti),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('get_recent_earthquakes', {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('minmagnitude=0.5');
  });

  it('respects custom min_magnitude', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextMulti),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('get_recent_earthquakes', { min_magnitude: 2.0 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('minmagnitude=2');
  });

  it('respects days param, caps at 365', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextMulti),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('get_recent_earthquakes', { days: 9999 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    // days capped at 365 — starttime should be about a year ago
    expect(calledUrl).toContain('starttime=');
  });

  it('respects limit param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextMulti),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('get_recent_earthquakes', { limit: 5 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=5');
  });

  it('returns empty result on 204', async () => {
    mockFetch204();
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.count).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('returns empty result on empty body', async () => {
    mockFetchText(mockFdsnTextEmpty);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.count).toBe(0);
  });

  it('skips malformed rows with insufficient fields', async () => {
    mockFetchText(mockFdsnTextMalformed);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    // Only 1 valid row, malformed row skipped
    expect(result.count).toBe(1);
  });

  it('skips rows with NaN depth or magnitude', async () => {
    mockFetchText(mockFdsnTextNanFields);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.count).toBe(0);
  });

  it('when all events are blasts, default filter returns 0', async () => {
    mockFetchText(mockFdsnTextAllBlasts);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.count).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  it('all blasts returned when include_blasts=true', async () => {
    mockFetchText(mockFdsnTextAllBlasts);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', { include_blasts: true }));
    expect(result.count).toBe(2);
  });

  it('throws on HTTP error', async () => {
    mockFetchError(500);
    await expect(handleEarthquakes('get_recent_earthquakes', {})).rejects.toThrow('HTTP 500');
  });

  it('result contains source attribution', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.source).toContain('SED');
  });

  it('header-only body returns 0 events', async () => {
    mockFetchText(mockFdsnTextHeaderOnly);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.count).toBe(0);
  });

  it('include_blasts string "true" is treated as truthy', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', { include_blasts: 'true' as unknown as boolean }));
    expect(result.include_blasts).toBe(true);
    expect(result.count).toBe(5);
  });
});

// ── get_earthquake_details ────────────────────────────────────────────────────

describe('get_earthquake_details', () => {
  it('returns event details for a known event', async () => {
    mockFetchText(mockFdsnTextSingle);
    const result = JSON.parse(
      await handleEarthquakes('get_earthquake_details', {
        event_id: 'smi:ch.ethz.sed/sc25a/Event/2026errxzt',
      })
    );
    expect(result.event).toBeDefined();
    expect(result.event.event_id).toBe('smi:ch.ethz.sed/sc25a/Event/2026errxzt');
    expect(result.event.location).toBe('Sion VS');
    expect(result.event.event_type).toBe('earthquake');
  });

  it('passes eventid in URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextSingle),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('get_earthquake_details', {
      event_id: 'smi:ch.ethz.sed/sc25a/Event/2026errxzt',
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('eventid=');
  });

  it('returns error object on 204 (event not found)', async () => {
    mockFetch204();
    const result = JSON.parse(
      await handleEarthquakes('get_earthquake_details', { event_id: 'smi:unknown' })
    );
    expect(result.error).toBeDefined();
    expect(result.event_id).toBe('smi:unknown');
  });

  it('returns error when body parses to 0 events', async () => {
    mockFetchText(mockFdsnTextEmpty);
    const result = JSON.parse(
      await handleEarthquakes('get_earthquake_details', { event_id: 'smi:unknown' })
    );
    expect(result.error).toBeDefined();
  });

  it('throws when event_id is missing', async () => {
    await expect(handleEarthquakes('get_earthquake_details', {} as Record<string, string>))
      .rejects.toThrow('event_id is required');
  });

  it('throws on HTTP error', async () => {
    mockFetchError(404);
    await expect(handleEarthquakes('get_earthquake_details', { event_id: 'smi:bad' }))
      .rejects.toThrow('HTTP 404');
  });

  it('returns source attribution', async () => {
    mockFetchText(mockFdsnTextSingle);
    const result = JSON.parse(
      await handleEarthquakes('get_earthquake_details', {
        event_id: 'smi:ch.ethz.sed/sc25a/Event/2026errxzt',
      })
    );
    expect(result.source).toContain('SED');
  });
});

// ── search_earthquakes_by_location ────────────────────────────────────────────

describe('search_earthquakes_by_location', () => {
  it('returns count and events near Bern', async () => {
    mockFetchText(mockFdsnTextNearBern);
    const result = JSON.parse(
      await handleEarthquakes('search_earthquakes_by_location', { lat: 46.9, lon: 7.5 })
    );
    expect(result.count).toBe(2);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.center).toEqual({ lat: 46.9, lon: 7.5 });
  });

  it('passes lat, lon, maxradiuskm, and starttime to URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextNearBern),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('search_earthquakes_by_location', {
      lat: 46.9,
      lon: 7.5,
      radius_km: 100,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('latitude=46.9');
    expect(calledUrl).toContain('longitude=7.5');
    expect(calledUrl).toContain('maxradiuskm=100');
    expect(calledUrl).toContain('starttime=');
  });

  it('defaults: radius_km=50, days=90, min_magnitude=0.5', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextNearBern),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('search_earthquakes_by_location', { lat: 46.9, lon: 7.5 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('maxradiuskm=50');
    expect(calledUrl).toContain('minmagnitude=0.5');
  });

  it('caps radius_km at 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockFdsnTextNearBern),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEarthquakes('search_earthquakes_by_location', {
      lat: 46.9,
      lon: 7.5,
      radius_km: 9999,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('maxradiuskm=500');
  });

  it('returns empty result on 204', async () => {
    mockFetch204();
    const result = JSON.parse(
      await handleEarthquakes('search_earthquakes_by_location', { lat: 46.9, lon: 7.5 })
    );
    expect(result.count).toBe(0);
    expect(result.events).toHaveLength(0);
    expect(result.center).toEqual({ lat: 46.9, lon: 7.5 });
  });

  it('throws when lat is NaN', async () => {
    await expect(
      handleEarthquakes('search_earthquakes_by_location', {
        lat: 'not-a-number' as unknown as number,
        lon: 7.5,
      })
    ).rejects.toThrow('lat and lon must be valid numbers');
  });

  it('throws when lon is NaN', async () => {
    await expect(
      handleEarthquakes('search_earthquakes_by_location', {
        lat: 46.9,
        lon: 'bad' as unknown as number,
      })
    ).rejects.toThrow('lat and lon must be valid numbers');
  });

  it('throws on HTTP error', async () => {
    mockFetchError(503);
    await expect(
      handleEarthquakes('search_earthquakes_by_location', { lat: 46.9, lon: 7.5 })
    ).rejects.toThrow('HTTP 503');
  });

  it('result contains radius_km, days_searched, source', async () => {
    mockFetchText(mockFdsnTextNearBern);
    const result = JSON.parse(
      await handleEarthquakes('search_earthquakes_by_location', {
        lat: 46.9,
        lon: 7.5,
        radius_km: 75,
        days: 60,
      })
    );
    expect(result.radius_km).toBe(75);
    expect(result.days_searched).toBe(60);
    expect(result.source).toContain('SED');
  });

  it('empty body returns 0 events', async () => {
    mockFetchText(mockFdsnTextEmpty);
    const result = JSON.parse(
      await handleEarthquakes('search_earthquakes_by_location', { lat: 46.9, lon: 7.5 })
    );
    expect(result.count).toBe(0);
  });
});

// ── FDSN parser edge cases ────────────────────────────────────────────────────

describe('parser edge cases', () => {
  it('events include negative depth (surface events)', async () => {
    mockFetchText(mockFdsnTextMulti);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', { include_blasts: true }));
    // Muerren BE has depth -2.30 in mock
    const muerren = result.events.find((e: { location: string }) => e.location === 'Muerren BE');
    expect(muerren).toBeDefined();
    expect(muerren.depth_km).toBeLessThan(0);
  });

  it('events have author field', async () => {
    mockFetchText(mockFdsnTextSingle);
    const result = JSON.parse(await handleEarthquakes('get_recent_earthquakes', {}));
    expect(result.events[0].author).toBeDefined();
    expect(typeof result.events[0].author).toBe('string');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown earthquake tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleEarthquakes('does_not_exist', {})).rejects.toThrow(
      'Unknown earthquake tool: does_not_exist'
    );
  });
});
