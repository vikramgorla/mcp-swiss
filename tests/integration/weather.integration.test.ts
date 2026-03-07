// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleWeather } from '../../src/modules/weather.js';

describe('Weather API (live)', () => {
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

  it('get_weather_history returns station and data array', async () => {
    const result = JSON.parse(await handleWeather('get_weather_history', {
      station: 'BER',
      start_date: '2026-03-01',
      end_date: '2026-03-02',
    }));
    expect(result.station).toBe('BER');
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.data)).toBe(true);
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
      start_date: '2026-03-01',
      end_date: '2026-03-02',
    }));
    expect(result.station).toBe('2135');
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
