// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleWeather } from '../../src/modules/weather.js';

describe('Weather API (live)', () => {
  it('get_weather returns data for BER station', async () => {
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    expect(result).toHaveProperty('payload');
    expect(Array.isArray(result.payload)).toBe(true);
    expect(result.payload.length).toBeGreaterThan(0);
  });

  it('weather payload contains temperature reading', async () => {
    const result = JSON.parse(await handleWeather('get_weather', { station: 'BER' }));
    const tt = result.payload.find((p: { par: string }) => p.par === 'tt');
    expect(tt).toBeDefined();
    expect(typeof tt.val).toBe('number');
  });

  it('list_weather_stations returns payload object', async () => {
    const result = JSON.parse(await handleWeather('list_weather_stations', {}));
    expect(result).toHaveProperty('payload');
    expect(typeof result.payload).toBe('object');
    // Should have many stations
    expect(Object.keys(result.payload).length).toBeGreaterThan(5);
  });

  it('get_weather_history returns historical data', async () => {
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: '2026-03-01',
      end_date: '2026-03-02',
    }));
    expect(result).toHaveProperty('payload');
    // May be array or object
    const payload = result.payload;
    expect(payload).toBeDefined();
  });

  it('get_water_level returns hydro data for Aare/Bern', async () => {
    const result = JSON.parse(await handleWeather('get_water_level', { station: '2135' }));
    expect(result).toHaveProperty('payload');
    expect(Array.isArray(result.payload)).toBe(true);
  });

  it('list_hydro_stations returns stations payload', async () => {
    const result = JSON.parse(await handleWeather('list_hydro_stations', {}));
    expect(result).toHaveProperty('payload');
    expect(Object.keys(result.payload).length).toBeGreaterThan(5);
  });

  it('get_water_history returns historical hydro data', async () => {
    const result = JSON.parse(await handleWeather('get_water_history', {
      station: '2135',
      start_date: '2026-03-01',
      end_date: '2026-03-02',
    }));
    expect(result).toBeDefined();
  });
});
