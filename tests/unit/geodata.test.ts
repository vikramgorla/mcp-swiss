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
  it('returns slim results with count', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Bundesplatz 3, Bern' }));
    expect(result.count).toBe(1);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('result has lat/lon and label', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Bundesplatz 3, Bern' }));
    const r = result.results[0];
    expect(r.lat).toBeCloseTo(46.946, 2);
    expect(r.lon).toBeCloseTo(7.444, 2);
    expect(r.label).toContain('Bundesplatz');
  });

  it('result has type (origin)', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Bundesplatz 3, Bern' }));
    expect(result.results[0].type).toBe('address');
  });

  it('passes address as searchText param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockGeocodeResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('geocode', { address: 'Bern Bahnhof' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('searchText')).toBe('Bern Bahnhof');
  });

  it('returns empty results when not found', async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(await handleGeodata('geocode', { address: 'Xyz123NotARealPlace' }));
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

// ── reverse_geocode ───────────────────────────────────────────────────────────

describe('reverse_geocode', () => {
  it('returns slim results with count', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('reverse_geocode', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.count).toBe(1);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('result has coordinates', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('reverse_geocode', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(typeof result.results[0].lat).toBe('number');
    expect(typeof result.results[0].lon).toBe('number');
  });
});

// ── search_places ─────────────────────────────────────────────────────────────

describe('search_places', () => {
  it('returns slim results', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('search_places', { query: 'Bern' }));
    expect(result.count).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('label');
  });

  it('passes query as searchText', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockGeocodeResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('search_places', { query: 'Matterhorn' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('searchText')).toBe('Matterhorn');
  });
});

// ── get_solar_potential ───────────────────────────────────────────────────────

describe('get_solar_potential', () => {
  it('returns buildings with aggregated data', async () => {
    mockFetch(mockSolarResponse);
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.count).toBe(1); // Both surfaces belong to same building
    expect(Array.isArray(result.buildings)).toBe(true);
    expect(result.source).toContain('BFE');
  });

  it('aggregates surfaces per building', async () => {
    mockFetch(mockSolarResponse);
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    const building = result.buildings[0];
    expect(building.buildingId).toBe(3155346);
    expect(building.totalElectricity_kWh).toBe(20000); // 12500 + 7500
    expect(building.totalFinancialReturn_CHF).toBe(4400); // 2800 + 1600
    expect(building.roofSurfaces).toBe(2);
    expect(building.bestClass).toBe(1);
  });

  it('handles null values in solar attributes gracefully', async () => {
    mockFetch({
      results: [{
        layerBodId: 'ch.bfe.solarenergie-eignung-daecher',
        layerName: 'Solar',
        featureId: 9999,
        id: 9999,
        attributes: {
          building_id: 555,
          klasse: 3,
          klasse_text: 'wenig geeignet',
          flaeche: null,
          ausrichtung: 'N',
          neigung: 45,
          stromertrag: null,
          stromertrag_winterhalbjahr: null,
          stromertrag_sommerhalbjahr: null,
          finanzertrag: null,
          gstrahlung: 800,
          gwr_egid: null,
          df_nummer: 1,
          label: 'Test',
        },
      }],
    });
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.buildings[0].totalArea_m2).toBe(0);
    expect(result.buildings[0].totalElectricity_kWh).toBe(0);
  });

  it('uses tight tolerance and extent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockSolarResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('get_solar_potential', { lat: 46.946774, lng: 7.444192 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('identify');
    expect(calledUrl).toContain('solar');
    expect(calledUrl).toContain('tolerance=10');
  });
});

// ── identify_location ─────────────────────────────────────────────────────────

describe('identify_location', () => {
  it('returns slim results with count', async () => {
    mockFetch(mockIdentifyResponse);
    const result = JSON.parse(await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.count).toBe(1);
    expect(result.results[0].layer).toBe('SwissNAMES3D');
    expect(result.results[0].layerId).toBe('ch.swisstopo.swissnames3d');
  });

  it('result has attributes', async () => {
    mockFetch(mockIdentifyResponse);
    const result = JSON.parse(await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.results[0].attributes.label).toBe('Bern');
  });

  it('passes custom layers param when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192, layers: 'ch.swisstopo.swissnames3d',
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('layers=all%3Ach.swisstopo.swissnames3d');
  });

  it('uses "all" layers when none specified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('identify_location', { lat: 46.946774, lng: 7.444192 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('layers=all');
    expect(calledUrl).not.toContain('layers=all%3A');
  });
});

// ── get_municipality ──────────────────────────────────────────────────────────

describe('get_municipality', () => {
  it('returns slim results', async () => {
    mockFetch(mockGeocodeResponse);
    const result = JSON.parse(await handleGeodata('get_municipality', { name: 'Bern' }));
    expect(result.count).toBeGreaterThan(0);
  });

  it('passes municipality name to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockGeocodeResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGeodata('get_municipality', { name: 'Lugano' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('searchText')).toBe('Lugano');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown geodata tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleGeodata('does_not_exist', {}))
      .rejects.toThrow('Unknown geodata tool: does_not_exist');
  });
});
