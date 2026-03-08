// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleAirQuality } from '../../src/modules/airquality.js';

describe('Air Quality (live API)', () => {
  it('list_air_quality_stations returns at least 14 stations', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    expect(result.count).toBeGreaterThanOrEqual(14);
    expect(typeof result.stations).toBe('object');
  });

  it('list includes BER (Bern) with canton and environment', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    expect(result.stations['BER']).toContain('Bern');
    expect(result.stations['BER']).toContain('BE');
    expect(result.stations['BER']).toContain('urban');
  });

  it('list includes key stations: BAS, DAV, LUG, RIG', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    expect(result.stations).toHaveProperty('BAS');
    expect(result.stations).toHaveProperty('DAV');
    expect(result.stations).toHaveProperty('LUG');
    expect(result.stations).toHaveProperty('RIG');
  });

  it('list response is under 10K', async () => {
    const result = await handleAirQuality('list_air_quality_stations', {});
    expect(result.length).toBeLessThan(10000);
  });

  it('get_air_quality for BER returns correct metadata', async () => {
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.station).toBe('BER');
    expect(result.name).toBe('Bern-Bollwerk');
    expect(result.canton).toBe('BE');
    expect(result.environment).toBe('urban');
  });

  it('get_air_quality for BER has Swiss LRV limits', async () => {
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    const limits = result.swiss_legal_limits_lrv;
    expect(limits.PM10.annual_mean_µg_m3).toBe(20);
    expect(limits.NO2.annual_mean_µg_m3).toBe(30);
    expect(limits.O3.hourly_mean_µg_m3).toBe(120);
    expect(limits.PM2_5.annual_mean_µg_m3).toBe(10);
  });

  it('get_air_quality for BER has coordinates', async () => {
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.coordinates.lat).toBeCloseTo(46.95, 1);
    expect(result.coordinates.lon).toBeCloseTo(7.44, 1);
  });

  it('get_air_quality for LUG (Lugano, Ticino) has canton TI', async () => {
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'LUG' }));
    expect(result.canton).toBe('TI');
  });

  it('get_air_quality for DAV (Davos) has alpine environment', async () => {
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'DAV' }));
    expect(result.environment).toBe('alpine');
    expect(result.altitude_m).toBeGreaterThan(1000);
  });

  it('get_air_quality includes BAFU data portal link', async () => {
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'ZUE' }));
    expect(result.live_data_portal).toContain('bafu.admin.ch');
  });

  it('get_air_quality response under 5K', async () => {
    const result = await handleAirQuality('get_air_quality', { station: 'BAS' });
    expect(result.length).toBeLessThan(5000);
  });
});
