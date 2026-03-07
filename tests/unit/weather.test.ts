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
  it('returns weather data with payload', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result).toHaveProperty('payload');
    expect(Array.isArray(result.payload)).toBe(true);
  });

  it('payload contains temperature (tt) reading', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    const tt = result.payload.find((p: { par: string }) => p.par === 'tt');
    expect(tt).toBeDefined();
    expect(tt.val).toBe(11.2);
    expect(tt.loc).toBe('BER');
  });

  it('payload contains humidity (rh) reading', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    const rh = result.payload.find((p: { par: string }) => p.par === 'rh');
    expect(rh).toBeDefined();
    expect(rh.val).toBe(72);
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

  it('includes source and license info', async () => {
    mockFetch(mockWeatherResponse);
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result.source).toContain('MeteoSwiss');
    expect(result.license).toBeTruthy();
  });
});

// ── list_weather_stations ─────────────────────────────────────────────────────

describe('list_weather_stations', () => {
  it('returns stations as object payload', async () => {
    mockFetch(mockWeatherStations);
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result).toHaveProperty('payload');
    expect(typeof result.payload).toBe('object');
  });

  it('payload contains known station keys', async () => {
    mockFetch(mockWeatherStations);
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.payload).toHaveProperty('BER');
    expect(result.payload).toHaveProperty('SMA');
    expect(result.payload).toHaveProperty('LUG');
  });

  it('station entries have name and details', async () => {
    mockFetch(mockWeatherStations);
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    const ber = result.payload['BER'];
    expect(ber.details.name).toContain('Bern');
    expect(ber.details.canton).toBe('BE');
  });
});

// ── get_weather_history ───────────────────────────────────────────────────────

describe('get_weather_history', () => {
  it('returns historical payload array', async () => {
    mockFetch(mockWeatherHistoryResponse);
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: '2026-03-06',
      end_date: '2026-03-07',
    }));
    expect(result).toHaveProperty('payload');
    expect(Array.isArray(result.payload)).toBe(true);
    expect(result.payload.length).toBeGreaterThan(0);
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
  it('returns hydro data with payload', async () => {
    mockFetch(mockHydroResponse);
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    expect(result).toHaveProperty('payload');
    expect(Array.isArray(result.payload)).toBe(true);
  });

  it('payload contains temperature reading', async () => {
    mockFetch(mockHydroResponse);
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    const temp = result.payload.find((p: { par: string }) => p.par === 'temperature');
    expect(temp).toBeDefined();
    expect(temp.val).toBe(9.18);
  });

  it('payload contains height and flow readings', async () => {
    mockFetch(mockHydroResponse);
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    const height = result.payload.find((p: { par: string }) => p.par === 'height');
    const flow = result.payload.find((p: { par: string }) => p.par === 'flow');
    expect(height?.val).toBe(501.51);
    expect(flow?.val).toBe(40.99);
  });
});

// ── list_hydro_stations ───────────────────────────────────────────────────────

describe('list_hydro_stations', () => {
  it('returns hydro stations payload', async () => {
    mockFetch(mockHydroStations);
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result).toHaveProperty('payload');
  });

  it('payload has station entries', async () => {
    mockFetch(mockHydroStations);
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.payload).toHaveProperty('2135');
    expect(result.payload['2135'].details.river).toBe('Aare');
  });
});

// ── get_water_history ─────────────────────────────────────────────────────────

describe('get_water_history', () => {
  it('returns historical hydro data', async () => {
    mockFetch(mockHydroHistoryResponse);
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135',
      start_date: '2026-03-06',
      end_date: '2026-03-07',
    }));
    expect(result).toHaveProperty('payload');
    expect(Array.isArray(result.payload)).toBe(true);
    expect(result.payload.length).toBeGreaterThan(0);
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
