import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleGeodata } from '../../src/modules/geodata.js';
import {
  mockGeocodeResponse,
  mockIdentifyResponse,
  mockSolarResponse,
  mockEmptyResults,
} from '../fixtures/geodata.js';

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

// ── geocode ───────────────────────────────────────────────────────────────────

describe('geocode', () => {
  it('returns results array', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Bundesplatz 3, Bern' }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it('result has lat/lon coordinates', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Bundesplatz 3, Bern' }));
    const attrs = result.results[0].attrs;
    expect(attrs.lat).toBeCloseTo(46.946, 2);
    expect(attrs.lon).toBeCloseTo(7.444, 2);
  });

  it('result has label and detail', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Bundesplatz 3, Bern' }));
    expect(result.results[0].attrs.label).toContain('Bundesplatz');
    expect(result.results[0].attrs.detail).toContain('bern');
  });

  it('passes address as searchText param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockGeocodeResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('geocode', { address: 'Bern Bahnhof' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(decodeURIComponent(calledUrl)).toContain('Bern Bahnhof');
  });

  it('returns empty results when not found', async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Xyz123NotARealPlace' }));
    expect(result.results).toHaveLength(0);
  });
});

// ── reverse_geocode ───────────────────────────────────────────────────────────

describe('reverse_geocode', () => {
  it('returns results array', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('reverse_geocode', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('result attributes are present', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('reverse_geocode', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.results[0].attrs).toBeDefined();
    expect(typeof result.results[0].attrs.lat).toBe('number');
  });
});

// ── search_places ─────────────────────────────────────────────────────────────

describe('search_places', () => {
  it('returns results', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('search_places', { query: 'Bern' }));
    expect(result).toHaveProperty('results');
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('passes query as searchText', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockGeocodeResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('search_places', { query: 'Matterhorn' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(decodeURIComponent(calledUrl)).toContain('Matterhorn');
  });
});

// ── get_solar_potential ───────────────────────────────────────────────────────

describe('get_solar_potential', () => {
  it('returns results array', async () => {
    mockFetch(mockSolarResponse);
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('result has solar layer data', async () => {
    mockFetch(mockSolarResponse);
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.results[0].layerBodId).toContain('solar');
    expect(result.results[0].attributes).toBeDefined();
  });

  it('calls identify endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockSolarResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('get_solar_potential', { lat: 46.946774, lng: 7.444192 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('identify');
    expect(calledUrl).toContain('solar');
  });
});

// ── identify_location ─────────────────────────────────────────────────────────

describe('identify_location', () => {
  it('returns results array', async () => {
    mockFetch(mockIdentifyResponse);
    const result = JSON.parse(await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result).toHaveProperty('results');
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('result has layer and attribute info', async () => {
    mockFetch(mockIdentifyResponse);
    const result = JSON.parse(await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.results[0].layerBodId).toBeTruthy();
    expect(result.results[0].attributes.label).toBe('Bern');
  });

  it('calls identify endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('identify_location', { lat: 46.946774, lng: 7.444192 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('identify');
  });
});

// ── get_municipality ──────────────────────────────────────────────────────────

describe('get_municipality', () => {
  it('returns results', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('get_municipality', { name: 'Bern' }));
    expect(result).toHaveProperty('results');
  });

  it('passes municipality name to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockGeocodeResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('get_municipality', { name: 'Lugano' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(decodeURIComponent(calledUrl)).toContain('Lugano');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown geodata tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleGeodata('does_not_exist', {}))
      .rejects.toThrow('Unknown geodata tool: does_not_exist');
  });
});
