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
    // startdt/enddt are ignored by api.existenz.ch, which then returns the last 24 h
    expect(calledUrl).toContain('startdate=2026-03-01');
    expect(calledUrl).toContain('enddate=2026-03-07');
    expect(calledUrl).not.toContain('startdt=');
  });
});

// ── history resolution ────────────────────────────────────────────────────────

describe('get_weather_history resolution', () => {
  /** n readings per parameter at 10-minute spacing, as the station reports. */
  function payload(readings: number) {
    const start = Date.UTC(2026, 2, 1) / 1000;
    return {
      source: 'SwissMetNet',
      payload: Array.from({ length: readings }, (_, i) => ({
        timestamp: start + i * 600,
        loc: 'BER',
        par: 'tt',
        val: 5 + (i % 20) / 2,
      })),
    };
  }

  it('returns raw readings when the range is small', async () => {
    mockFetch(payload(50));
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-03-01', end_date: '2026-03-01',
    }));
    expect(result.resolution).toBe('raw');
    expect(result.count).toBe(50);
    expect(result.data[0]).toHaveProperty('param');
  });

  it('summarises a long range instead of returning megabytes', async () => {
    mockFetch(payload(40000));
    const body = await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-03-01', end_date: '2026-03-28',
    });
    const result = JSON.parse(body);
    // 40k raw readings would be several MB; no MCP client can use that.
    expect(body.length).toBeLessThan(50000);
    expect(result.resolution).toBe('daily');
    expect(result.readings_summarised).toBe(40000);
    expect(result.note).toMatch(/raw/);

    const bucket = result.data[0];
    expect(bucket.period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bucket.min).toBeLessThanOrEqual(bucket.mean);
    expect(bucket.mean).toBeLessThanOrEqual(bucket.max);
    expect(bucket.readings).toBeGreaterThan(0);
  });

  it('keeps hourly detail when that still fits', async () => {
    mockFetch(payload(900));
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-03-01', end_date: '2026-03-07',
    }));
    expect(result.resolution).toBe('hourly');
    expect(result.data[0].period).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
  });

  it('honours an explicit resolution, including raw over budget', async () => {
    mockFetch(payload(40000));
    const raw = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-03-01', end_date: '2026-03-28', resolution: 'raw',
    }));
    expect(raw.resolution).toBe('raw');
    expect(raw.count).toBe(40000);
    expect(raw.note).toBeUndefined();

    mockFetch(payload(50));
    const daily = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-03-01', end_date: '2026-03-01', resolution: 'daily',
    }));
    expect(daily.resolution).toBe('daily');
  });

  it('ignores readings with no usable value', async () => {
    mockFetch({
      source: 'SwissMetNet',
      payload: [
        { timestamp: 1741273800, loc: 'BER', par: 'tt', val: 8 },
        { timestamp: 1741273860, loc: 'BER', par: 'tt', val: Number.NaN },
        { timestamp: 1741273920, loc: 'BER', par: 'tt', val: 10 },
      ],
    });
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-03-01', end_date: '2026-03-01', resolution: 'daily',
    }));
    expect(result.data[0].readings).toBe(2);
    expect(result.data[0].mean).toBe(9);
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
    // startdt/enddt are ignored by api.existenz.ch, which then returns the last 24 h
    expect(calledUrl).toContain('startdate=2026-03-01');
    expect(calledUrl).toContain('enddate=2026-03-07');
    expect(calledUrl).not.toContain('startdt=');
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

  it('get_weather_history explains an empty payload (32-day window)', async () => {
    mockFetch({ source: 'test', payload: 'not-an-array' });
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER', start_date: '2026-01-01', end_date: '2026-01-02',
    }));
    expect(result.count).toBe(0);
    expect(result.note).toMatch(/32 days/);
    expect(result.note).toContain('2026-01-01');
  });

  it('get_water_level falls back to raw JSON when payload is not array', async () => {
    mockFetch({ source: 'test', payload: null });
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    expect(result.payload).toBeNull();
  });

  it('get_water_history explains an empty payload (32-day window)', async () => {
    mockFetch({ source: 'test', payload: {} });
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135', start_date: '2026-01-01', end_date: '2026-01-02',
    }));
    expect(result.count).toBe(0);
    expect(result.note).toMatch(/32 days/);
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown weather tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleWeather('does_not_exist', {}))
      .rejects.toThrow('Unknown weather tool: does_not_exist');
  });
});
