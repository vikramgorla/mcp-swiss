import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleTraffic, trafficTools } from '../../src/modules/traffic.js';
import {
  mockFindGotthardResponse,
  mockFindGotthardSingleResponse,
  mockFindCantonZHResponse,
  mockIdentifyNearbyResponse,
  mockEmptyResponse,
  mockZHStationNullData,
} from '../fixtures/traffic.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(payload),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── trafficTools array ────────────────────────────────────────────────────────

describe('trafficTools', () => {
  it('exports exactly 3 tools', () => {
    expect(trafficTools).toHaveLength(3);
  });

  it('exports get_traffic_count tool', () => {
    const tool = trafficTools.find(t => t.name === 'get_traffic_count');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('location');
  });

  it('exports get_traffic_by_canton tool', () => {
    const tool = trafficTools.find(t => t.name === 'get_traffic_by_canton');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('canton');
  });

  it('exports get_traffic_nearby tool', () => {
    const tool = trafficTools.find(t => t.name === 'get_traffic_nearby');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('lat');
    expect(tool?.inputSchema.required).toContain('lon');
  });

  it('all tools have descriptions', () => {
    for (const tool of trafficTools) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('all tools have valid inputSchema type', () => {
    for (const tool of trafficTools) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

// ── get_traffic_count ─────────────────────────────────────────────────────────

describe('get_traffic_count', () => {
  it('returns count and stations array', async () => {
    mockFetch(mockFindGotthardResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Gotthard' }));
    expect(result.count).toBe(2);
    expect(Array.isArray(result.stations)).toBe(true);
  });

  it('result has required traffic fields', async () => {
    mockFetch(mockFindGotthardSingleResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Gotthardtunnel' }));
    const s = result.stations[0];
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('canton');
    expect(s).toHaveProperty('road');
    expect(s).toHaveProperty('year');
    expect(s).toHaveProperty('avgDailyTraffic');
    expect(s).toHaveProperty('avgWeekdayTraffic');
    expect(s).toHaveProperty('heavyTrafficPct');
    expect(s).toHaveProperty('networkType');
  });

  it('returns correct values from fixture', async () => {
    mockFetch(mockFindGotthardSingleResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Gotthardtunnel' }));
    const s = result.stations[0];
    expect(s.name).toBe('GOTTHARDTUNNEL');
    expect(s.canton).toBe('UR');
    expect(s.road).toBe('A 2');
    expect(s.avgDailyTraffic).toBe(19391);
    expect(s.avgWeekdayTraffic).toBe(17939);
    expect(s.year).toBe(2024);
  });

  it('rounds heavyTrafficPct to 1 decimal', async () => {
    mockFetch(mockFindGotthardSingleResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Gotthard' }));
    const s = result.stations[0];
    // 8.574 → 8.6
    expect(s.heavyTrafficPct).toBeCloseTo(8.6, 1);
  });

  it('includes query in response', async () => {
    mockFetch(mockFindGotthardResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Gotthard' }));
    expect(result.query).toBe('Gotthard');
  });

  it('includes source attribution', async () => {
    mockFetch(mockFindGotthardResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Gotthard' }));
    expect(result.source).toContain('ASTRA');
  });

  it('returns empty stations on no results', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Xyz123NotReal' }));
    expect(result.count).toBe(0);
    expect(result.stations).toHaveLength(0);
  });

  it('passes location as searchText and uses mlocname searchField', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockFindGotthardResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_count', { location: 'Gotthard' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('searchText')).toBe('Gotthard');
    expect(parsed.searchParams.get('searchField')).toBe('mlocname');
    expect(parsed.searchParams.get('layer')).toBe('ch.astra.strassenverkehrszaehlung-uebergeordnet');
  });

  it('handles null traffic values gracefully', async () => {
    mockFetch({ results: [mockZHStationNullData] });
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'Affoltern' }));
    const s = result.stations[0];
    expect(s.avgDailyTraffic).toBeNull();
    expect(s.avgWeekdayTraffic).toBeNull();
    expect(s.heavyTrafficPct).toBeNull();
    expect(s.year).toBeNull();
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 500);
    await expect(handleTraffic('get_traffic_count', { location: 'Gotthard' })).rejects.toThrow('HTTP 500');
  });

  it('response size is under 50K chars', async () => {
    mockFetch(mockFindGotthardResponse);
    const result = await handleTraffic('get_traffic_count', { location: 'Gotthard' });
    expect(result.length).toBeLessThan(50000);
  });
});

// ── get_traffic_by_canton ─────────────────────────────────────────────────────

describe('get_traffic_by_canton', () => {
  it('returns canton, count and stations array', async () => {
    mockFetch(mockFindCantonZHResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', { canton: 'ZH' }));
    expect(result.canton).toBe('ZH');
    expect(result.count).toBe(2);
    expect(Array.isArray(result.stations)).toBe(true);
  });

  it('uppercases canton code', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockFindCantonZHResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_by_canton', { canton: 'zh' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('searchText')).toBe('ZH');
  });

  it('uses canton searchField', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockFindCantonZHResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_by_canton', { canton: 'ZH' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('searchField')).toBe('canton');
  });

  it('limits results to 20 stations', async () => {
    // Create 25 stations
    const manyStations = {
      results: Array.from({ length: 25 }, (_, i) => ({
        layerBodId: 'ch.astra.strassenverkehrszaehlung-uebergeordnet',
        layerName: 'Verkehrszählung - übergeordnet',
        featureId: 5000 + i,
        id: 5000 + i,
        attributes: {
          mlocname: `STATION ${i}`,
          canton: 'ZH',
          streetdesignation: 'A 1',
          year: 2024,
          dtv: 10000 + i * 100,
          dwv: 11000 + i * 100,
          prctheavytraffic: 3.5,
          de_networktype: 'Grundnetz',
        },
      })),
    };
    mockFetch(manyStations);
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', { canton: 'ZH' }));
    expect(result.stations.length).toBeLessThanOrEqual(20);
    expect(result.total).toBe(25);
  });

  it('includes total (before cap) in response', async () => {
    mockFetch(mockFindCantonZHResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', { canton: 'ZH' }));
    expect(result).toHaveProperty('total');
    expect(result.total).toBe(2);
  });

  it('stations have required fields', async () => {
    mockFetch(mockFindCantonZHResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', { canton: 'ZH' }));
    const s = result.stations[0];
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('canton');
    expect(s).toHaveProperty('avgDailyTraffic');
  });

  it('includes source attribution', async () => {
    mockFetch(mockFindCantonZHResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', { canton: 'ZH' }));
    expect(result.source).toContain('ASTRA');
  });

  it('returns empty stations for unknown canton', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', { canton: 'XX' }));
    expect(result.count).toBe(0);
    expect(result.stations).toHaveLength(0);
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 404);
    await expect(handleTraffic('get_traffic_by_canton', { canton: 'ZH' })).rejects.toThrow('HTTP 404');
  });

  it('response size is under 50K chars', async () => {
    mockFetch(mockFindCantonZHResponse);
    const result = await handleTraffic('get_traffic_by_canton', { canton: 'ZH' });
    expect(result.length).toBeLessThan(50000);
  });
});

// ── get_traffic_nearby ────────────────────────────────────────────────────────

describe('get_traffic_nearby', () => {
  it('returns count, lat, lon, radius and stations', async () => {
    mockFetch(mockIdentifyNearbyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.377, lon: 8.542,
    }));
    expect(result.count).toBe(1);
    expect(result.lat).toBe(47.377);
    expect(result.lon).toBe(8.542);
    expect(result.radius_m).toBe(5000);
    expect(Array.isArray(result.stations)).toBe(true);
  });

  it('uses default radius of 5000 when not specified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyNearbyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_nearby', { lat: 47.377, lon: 8.542 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('tolerance')).toBe('5000');
  });

  it('uses custom radius when specified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyNearbyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_nearby', { lat: 47.377, lon: 8.542, radius: 10000 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('tolerance')).toBe('10000');
    const result = JSON.parse(await (async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200, statusText: 'OK',
        json: () => Promise.resolve(mockIdentifyNearbyResponse),
      }));
      return handleTraffic('get_traffic_nearby', { lat: 47.377, lon: 8.542, radius: 10000 });
    })());
    expect(result.radius_m).toBe(10000);
  });

  it('uses LV95 converted coordinates in identify call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyNearbyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_nearby', { lat: 46.9480, lon: 7.4474 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    const geom = parsed.searchParams.get('geometry') ?? '';
    // Bern is approx E=2600XXX, N=1199XXX in LV95
    const [eStr, nStr] = geom.split(',');
    expect(parseInt(eStr)).toBeGreaterThan(2595000);
    expect(parseInt(eStr)).toBeLessThan(2610000);
    expect(parseInt(nStr)).toBeGreaterThan(1195000);
    expect(parseInt(nStr)).toBeLessThan(1205000);
  });

  it('uses correct layer in identify call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockIdentifyNearbyResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleTraffic('get_traffic_nearby', { lat: 47.377, lon: 8.542 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get('layers')).toBe('all:ch.astra.strassenverkehrszaehlung-uebergeordnet');
    expect(parsed.searchParams.get('geometryType')).toBe('esriGeometryPoint');
  });

  it('station has required fields', async () => {
    mockFetch(mockIdentifyNearbyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.377, lon: 8.542,
    }));
    const s = result.stations[0];
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('canton');
    expect(s).toHaveProperty('avgDailyTraffic');
    expect(s).toHaveProperty('heavyTrafficPct');
  });

  it('station values are correct from fixture', async () => {
    mockFetch(mockIdentifyNearbyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.5, lon: 7.6,
    }));
    const s = result.stations[0];
    expect(s.name).toBe('MUTTENZ, A2/ZUBR. SCHAENZLI');
    expect(s.canton).toBe('BL');
    expect(s.avgDailyTraffic).toBe(67419);
  });

  it('includes source attribution', async () => {
    mockFetch(mockIdentifyNearbyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.377, lon: 8.542,
    }));
    expect(result.source).toContain('ASTRA');
  });

  it('returns empty stations when none nearby', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.377, lon: 8.542,
    }));
    expect(result.count).toBe(0);
    expect(result.stations).toHaveLength(0);
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 503);
    await expect(handleTraffic('get_traffic_nearby', { lat: 47.377, lon: 8.542 })).rejects.toThrow('HTTP 503');
  });

  it('response size is under 50K chars', async () => {
    mockFetch(mockIdentifyNearbyResponse);
    const result = await handleTraffic('get_traffic_nearby', { lat: 47.377, lon: 8.542 });
    expect(result.length).toBeLessThan(50000);
  });
});

// ── Slim result null branches ─────────────────────────────────────────────────

describe('slimTrafficStation null branches', () => {
  it('handles station with missing optional fields (undefined canton, road, etc.)', async () => {
    const minimalStation = {
      results: [{
        layerBodId: 'ch.astra.strassenverkehrszaehlung-uebergeordnet',
        layerName: 'Verkehrszählung - übergeordnet',
        featureId: 9999,
        id: 9999,
        attributes: {
          mlocname: 'TEST MINIMAL',
          // canton, streetdesignation, targetlocation1, targetlocation2, de_networktype all missing
          year: 2024,
          dtv: 1000,
          dwv: 900,
          prctheavytraffic: 5.0,
        },
      }],
    };
    mockFetch(minimalStation);
    const result = JSON.parse(await handleTraffic('get_traffic_count', { location: 'TEST' }));
    const s = result.stations[0];
    expect(s.canton).toBeNull();
    expect(s.road).toBeNull();
    expect(s.direction1).toBeNull();
    expect(s.direction2).toBeNull();
    expect(s.networkType).toBeNull();
    expect(s.avgDailyTraffic).toBe(1000);
    expect(s.heavyTrafficPct).toBe(5.0);
  });
});

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe('handleTraffic unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTraffic('unknown_tool', {})).rejects.toThrow('Unknown traffic tool: unknown_tool');
  });
});
