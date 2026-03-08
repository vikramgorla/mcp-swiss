import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleAirQuality } from '../../src/modules/airquality.js';
import {
  mockNabelStationResponse,
  mockNabelStationLugano,
  EXPECTED_STATION_CODES,
  EXPECTED_SWISS_LIMITS,
} from '../fixtures/airquality.js';

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

// ── list_air_quality_stations ─────────────────────────────────────────────────

describe('list_air_quality_stations', () => {
  it('returns all 14 NABEL stations', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    expect(result.count).toBe(14);
    expect(typeof result.stations).toBe('object');
  });

  it('contains all expected station codes', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    for (const code of EXPECTED_STATION_CODES) {
      expect(result.stations).toHaveProperty(code);
    }
  });

  it('station entries include name, canton, and environment', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    const berEntry = result.stations['BER'];
    expect(berEntry).toContain('Bern');
    expect(berEntry).toContain('BE');
    expect(berEntry).toContain('urban');
  });

  it('includes network and operator metadata', async () => {
    const result = JSON.parse(await handleAirQuality('list_air_quality_stations', {}));
    expect(result.network).toContain('NABEL');
    expect(result.operator).toContain('BAFU');
    expect(result.data_portal).toContain('bafu.admin.ch');
  });

  it('response is under 10K chars', async () => {
    const result = await handleAirQuality('list_air_quality_stations', {});
    expect(result.length).toBeLessThan(10000);
  });

  it('does NOT call fetch (uses local registry)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await handleAirQuality('list_air_quality_stations', {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── get_air_quality ───────────────────────────────────────────────────────────

describe('get_air_quality', () => {
  it('returns station info for BER (Bern)', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.station).toBe('BER');
    expect(result.name).toBe('Bern-Bollwerk');
    expect(result.canton).toBe('BE');
  });

  it('returns coordinates for BER', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.coordinates.lat).toBeCloseTo(46.95, 1);
    expect(result.coordinates.lon).toBeCloseTo(7.44, 1);
  });

  it('returns altitude for BER', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.altitude_m).toBe(540);
  });

  it('returns environment type', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.environment).toBe('urban');
  });

  it('returns Swiss LRV limits for all pollutants', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    const limits = result.swiss_legal_limits_lrv;
    expect(limits.PM10.annual_mean_µg_m3).toBe(EXPECTED_SWISS_LIMITS.PM10.annual_mean_µg_m3);
    expect(limits.PM2_5.annual_mean_µg_m3).toBe(EXPECTED_SWISS_LIMITS.PM2_5.annual_mean_µg_m3);
    expect(limits.O3.hourly_mean_µg_m3).toBe(EXPECTED_SWISS_LIMITS.O3.hourly_mean_µg_m3);
    expect(limits.NO2.annual_mean_µg_m3).toBe(EXPECTED_SWISS_LIMITS.NO2.annual_mean_µg_m3);
  });

  it('includes BAFU data portal link', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.live_data_portal).toContain('bafu.admin.ch');
  });

  it('falls back to local data when API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.station).toBe('BER');
    expect(result.name).toBe('Bern-Bollwerk');
    expect(result.canton).toBe('BE');
  });

  it('handles lowercase station codes', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'ber' }));
    expect(result.station).toBe('BER');
  });

  it('works for Lugano (LUG)', async () => {
    mockFetch(mockNabelStationLugano);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'LUG' }));
    expect(result.station).toBe('LUG');
    expect(result.canton).toBe('TI');
    expect(result.environment).toBe('urban');
  });

  it('works for alpine Davos (DAV)', async () => {
    mockFetch({ feature: null });
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'DAV' }));
    expect(result.station).toBe('DAV');
    expect(result.environment).toBe('alpine');
    expect(result.altitude_m).toBe(1590);
  });

  it('throws for unknown station code', async () => {
    await expect(
      handleAirQuality('get_air_quality', { station: 'XYZ' })
    ).rejects.toThrow('Unknown NABEL station code "XYZ"');
  });

  it('response is under 5K chars', async () => {
    mockFetch(mockNabelStationResponse);
    const result = await handleAirQuality('get_air_quality', { station: 'BER' });
    expect(result.length).toBeLessThan(5000);
  });

  it('includes geo.admin.ch as source', async () => {
    mockFetch(mockNabelStationResponse);
    const result = JSON.parse(await handleAirQuality('get_air_quality', { station: 'BER' }));
    expect(result.source).toContain('geo.admin.ch');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(
      handleAirQuality('get_pollen_count', {})
    ).rejects.toThrow('Unknown air quality tool: get_pollen_count');
  });
});
