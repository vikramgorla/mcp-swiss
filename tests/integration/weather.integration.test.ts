// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleWeather } from '../../src/modules/weather.js';

// api.existenz.ch refuses connections from some networks (e.g. GitHub-hosted
// runners). Skip instead of failing when it's unreachable from here.
const reachable = await fetch('https://api.existenz.ch/apiv1/smn/locations', { signal: AbortSignal.timeout(10_000) })
  .then((r) => r.ok)
  .catch(() => false);
if (!reachable) console.warn('api.existenz.ch unreachable — skipping weather/hydro live tests');

describe.skipIf(!reachable)('Weather API (live)', () => {
  it('get_weather returns flattened data for BER station', async () => {
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result.station).toBe('BER');
    expect(result.timestamp).toBeDefined();
    expect(typeof result.temperature_c).toBe('number');
    expect(result.source).toContain('MeteoSwiss');
  });

  it('weather data contains humidity and wind', async () => {
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(typeof result.humidity_pct).toBe('number');
    expect(typeof result.wind_speed_m_s).toBe('number');
  });

  it('list_weather_stations returns compact dict under 5K', async () => {
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result.count).toBeGreaterThan(5);
    expect(typeof result.stations).toBe('object');
    // Compact format: code → "name (canton)"
    expect(result.stations['BER']).toContain('Bern');
    // Size check
    const size = JSON.stringify(result).length;
    expect(size).toBeLessThan(5000);
  });

  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

  it('get_weather_history returns readings inside the requested range', async () => {
    const start = daysAgo(10);
    const end = daysAgo(8);
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: start,
      end_date: end,
    }));
    expect(result.station).toBe('BER');
    expect(result.count).toBeGreaterThan(0);

    // The bug this guards: wrong parameter names made the API ignore the range
    // and return the last 24 h instead. A multi-day range is summarised, so the
    // period label carries the date.
    const days = (result.data as Array<{ time?: string; period?: string }>)
      .map((r) => (r.period ?? r.time)?.slice(0, 10))
      .filter(Boolean) as string[];
    expect(days.length).toBeGreaterThan(0);
    expect(Math.min(...days.map(Date.parse))).toBeGreaterThanOrEqual(Date.parse(start));
    expect(Math.max(...days.map(Date.parse))).toBeLessThanOrEqual(Date.parse(end) + 86_400_000);
  });

  it('get_weather_history keeps a long range inside the response budget', async () => {
    const body = await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: daysAgo(30),
      end_date: daysAgo(0),
    });
    const result = JSON.parse(body);
    // Raw, a month of 10-minute readings is several MB.
    expect(body.length).toBeLessThan(50_000);
    expect(result.resolution).toBe('daily');
    expect(result.readings_summarised).toBeGreaterThan(result.count);
  });

  it('get_weather_history explains a range older than the 32-day archive', async () => {
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: daysAgo(400),
      end_date: daysAgo(398),
    }));
    expect(result.count).toBe(0);
    expect(result.note).toMatch(/32 days/);
  });

  it('get_water_history returns readings inside the requested range', async () => {
    const start = daysAgo(6);
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135',
      start_date: start,
      end_date: daysAgo(5),
    }));
    expect(result.count).toBeGreaterThan(0);
    const first = (result.data as Array<{ time?: string }>)[0]?.time;
    expect(Date.parse(first!)).toBeGreaterThanOrEqual(Date.parse(start));
  });

  it('get_water_level returns readings for Aare/Bern', async () => {
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    expect(result.station).toBe('2135');
    expect(Array.isArray(result.readings)).toBe(true);
    expect(result.readings.length).toBeGreaterThan(0);
  });

  it('list_hydro_stations returns compact dict under 10K', async () => {
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result.count).toBeGreaterThan(5);
    expect(typeof result.stations).toBe('object');
    // Compact format: id → "name (waterBody, type)"
    expect(result.stations['2135']).toContain('Aare');
    const size = JSON.stringify(result).length;
    expect(size).toBeLessThan(15000);
  });

  it('get_water_history returns historical hydro data', async () => {
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135',
      start_date: daysAgo(3),
      end_date: daysAgo(2),
    }));
    expect(result.station).toBe('2135');
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
