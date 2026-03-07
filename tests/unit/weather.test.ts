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

// ── fallback paths (non-array payload) ────────────────────────────────────────

// ── edge cases: null/missing fields ──────────────────────────────────────────

describe('edge cases', () => {
  it('toISO returns undefined for falsy timestamp', async () => {
    mockFetch({ payload: [{ timestamp: 0, par: 'tt', val: 5 }] });
    const result = JSON.parse(await handleWeather('get_weather', { station: 'X' }));
    expect(result.timestamp).toBeUndefined();
  });

  it('weather station without canton omits parenthetical', async () => {
    mockFetch({
      payload: {
        TEST: { id: 1, name: 'TEST', details: { id: 'TEST', name: 'Test Station' } },
      },
    });
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.stations['TEST']).toBe('Test Station');
    expect(result.stations['TEST']).not.toContain('(');
  });

  it('weather station falls back to entry name if details.id missing', async () => {
    mockFetch({
      payload: {
        FALLBACK: { id: 1, name: 'FALLBACK', details: { name: 'Fallback', canton: 'ZH' } },
      },
    });
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    // details.id is undefined → falls back to entry.name as key
    expect(result.stations['FALLBACK']).toBe('Fallback (ZH)');
  });

  it('weather station with no details uses entry name', async () => {
    mockFetch({ payload: { X: { id: 1, name: 'X' } } });
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.stations['X']).toBe('X');
  });

  it('hydro station without water body info uses name only', async () => {
    mockFetch({
      payload: {
        "9999": { id: 1, name: '9999', details: { id: '9999', name: 'Bare Station' } },
      },
    });
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.stations['9999']).toBe('Bare Station');
    expect(result.stations['9999']).not.toContain('(');
  });

  it('hydro station with no details uses entry name', async () => {
    mockFetch({ payload: { "8888": { id: 1, name: '8888' } } });
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.stations['8888']).toBe('8888');
  });

  it('handles null payload gracefully for weather station list', async () => {
    mockFetch({ payload: null });
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.count).toBe(0);
  });

  it('handles null payload gracefully for hydro station list', async () => {
    mockFetch({ payload: null });
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.count).toBe(0);
  });

  it('history reading with falsy timestamp returns undefined time', async () => {
    mockFetch({ payload: [{ timestamp: 0, par: 'tt', val: 5 }] });
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'X', start_date: '2026-01-01', end_date: '2026-01-02',
    }));
    expect(result.data[0].time).toBeUndefined();
  });
});

describe('fallback when payload is not an array', () => {
  it('get_weather falls back to raw JSON when payload is not array', async () => {
    mockFetch({ source: 'test', payload: { unexpected: 'format' } });
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result.payload).toEqual({ unexpected: 'format' });
  });

  it('get_weather_history falls back to raw JSON when payload is not array', async () => {
    mockFetch({ source: 'test', payload: 'not-an-array' });
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-01-01', end_date: '2026-01-02',
    }));
    expect(result.payload).toBe('not-an-array');
  });

  it('get_water_level falls back to raw JSON when payload is not array', async () => {
    mockFetch({ source: 'test', payload: null });
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    expect(result.payload).toBeNull();
  });

  it('get_water_history falls back to raw JSON when payload is not array', async () => {
    mockFetch({ source: 'test', payload: {} });
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135', start_date: '2026-01-01', end_date: '2026-01-02',
    }));
    expect(result.payload).toEqual({});
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown weather tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleWeather('does_not_exist', {}))
      .rejects.toThrow('Unknown weather tool: does_not_exist');
  });
});
