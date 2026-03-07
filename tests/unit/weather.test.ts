import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleWeather } from '../../src/modules/weather.js';
import {
  mockWeatherResponse,
  mockWeatherStations,
  mockWeatherHistoryResponse,
  mockHydroResponse,
  mockHydroStations,
  mockHydroHistoryResponse,
} from '../fixtures/weather.js';

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

// ── get_weather ───────────────────────────────────────────────────────────────

describe('get_weather', () => {
  it('returns flattened weather data with human-readable keys', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result.station).toBe('BER');
    expect(result.temperature_c).toBe(11.2);
    expect(result.humidity_pct).toBe(72);
    expect(result.source).toContain('MeteoSwiss');
  });

  it('includes timestamp as ISO string', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result.timestamp).toBeDefined();
    expect(result.timestamp).toContain('T'); // ISO format
  });

  it('maps wind speed correctly', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result.wind_speed_m_s).toBe(2.1);
  });

  it('passes station code to API URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockWeatherResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleWeather('get_weather', { station: 'LUG' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('locations=LUG');
  });
});

// ── list_weather_stations ─────────────────────────────────────────────────────

describe('list_weather_stations', () => {
  it('returns count and compact stations dict', async () => {
    mockFetch(mockWeatherStations);
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.count).toBe(3);
    expect(typeof result.stations).toBe('object');
    expect(Array.isArray(result.stations)).toBe(false);
  });

  it('stations map code to "name (canton)"', async () => {
    mockFetch(mockWeatherStations);
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.stations['BER']).toContain('Bern');
    expect(result.stations['BER']).toContain('BE');
    expect(result.stations['LUG']).toContain('Lugano');
  });
});

// ── get_weather_history ───────────────────────────────────────────────────────

describe('get_weather_history', () => {
  it('returns station, count, and data array', async () => {
    mockFetch(mockWeatherHistoryResponse);
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: '2026-03-06',
      end_date: '2026-03-07',
    }));
    expect(result.station).toBe('BER');
    expect(result.count).toBe(4);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('data entries have time, param, value', async () => {
    mockFetch(mockWeatherHistoryResponse);
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: '2026-03-06',
      end_date: '2026-03-07',
    }));
    const entry = result.data[0];
    expect(entry.time).toContain('T');
    expect(entry.param).toBeDefined();
    expect(entry.value).toBeDefined();
  });

  it('passes date params to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockWeatherHistoryResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: '2026-03-01',
      end_date: '2026-03-07',
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('startdt=2026-03-01');
    expect(calledUrl).toContain('enddt=2026-03-07');
  });
});

// ── get_water_level ───────────────────────────────────────────────────────────

describe('get_water_level', () => {
  it('returns station and readings array', async () => {
    mockFetch(mockHydroResponse);
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    expect(result.station).toBe('2135');
    expect(Array.isArray(result.readings)).toBe(true);
  });

  it('readings contain temperature, height, and flow', async () => {
    mockFetch(mockHydroResponse);
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    const temp = result.readings.find((r: any) => r.param === 'temperature');
    const height = result.readings.find((r: any) => r.param === 'height');
    const flow = result.readings.find((r: any) => r.param === 'flow');
    expect(temp.value).toBe(9.18);
    expect(height.value).toBe(501.51);
    expect(flow.value).toBe(40.99);
  });
});

// ── list_hydro_stations ───────────────────────────────────────────────────────

describe('list_hydro_stations', () => {
  it('returns count and compact stations dict', async () => {
    mockFetch(mockHydroStations);
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.count).toBe(2);
    expect(typeof result.stations).toBe('object');
    expect(Array.isArray(result.stations)).toBe(false);
  });

  it('stations map id to "name (waterBody, type)"', async () => {
    mockFetch(mockHydroStations);
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.stations['2135']).toContain('Aare');
    expect(result.stations['2243']).toContain('Rhein');
  });
});

// ── get_water_history ─────────────────────────────────────────────────────────

describe('get_water_history', () => {
  it('returns station, count, and data array', async () => {
    mockFetch(mockHydroHistoryResponse);
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135',
      start_date: '2026-03-06',
      end_date: '2026-03-07',
    }));
    expect(result.station).toBe('2135');
    expect(result.count).toBe(4);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('passes date params to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockHydroHistoryResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleWeather('get_water_history', {
      station: '2135',
      start_date: '2026-03-01',
      end_date: '2026-03-07',
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('startdt=2026-03-01');
    expect(calledUrl).toContain('enddt=2026-03-07');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown weather tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleWeather('does_not_exist', {}))
      .rejects.toThrow('Unknown weather tool: does_not_exist');
  });
});
