// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleTraffic } from '../../src/modules/traffic.js';

describe('Traffic API (live)', () => {
  it('get_traffic_count finds Gotthard stations', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_count', {
      location: 'Gotthard',
    }));
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.stations)).toBe(true);
    expect(result.source).toContain('ASTRA');
  });

  it('get_traffic_count station has required fields', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_count', {
      location: 'Gotthard',
    }));
    if (result.stations.length > 0) {
      const s = result.stations[0];
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('canton');
      expect(s).toHaveProperty('road');
      expect(s).toHaveProperty('avgDailyTraffic');
      expect(s).toHaveProperty('avgWeekdayTraffic');
      expect(s).toHaveProperty('heavyTrafficPct');
      expect(s).toHaveProperty('year');
      expect(s).toHaveProperty('networkType');
    }
  });

  it('get_traffic_count Gotthard has traffic data', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_count', {
      location: 'GOTTHARDTUNNEL',
    }));
    if (result.stations.length > 0) {
      const tunnel = result.stations.find((s: { name: string }) =>
        s.name.toUpperCase().includes('GOTTHARD')
      );
      if (tunnel && tunnel.avgDailyTraffic != null) {
        expect(tunnel.avgDailyTraffic).toBeGreaterThan(0);
        expect(tunnel.year).toBeGreaterThanOrEqual(2020);
      }
    }
  });

  it('get_traffic_count response is under 50K chars', async () => {
    const result = await handleTraffic('get_traffic_count', { location: 'Zürich' });
    expect(result.length).toBeLessThan(50000);
  });

  it('get_traffic_count returns empty for unknown location', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_count', {
      location: 'Xyz123NotARealStation',
    }));
    expect(result.count).toBe(0);
    expect(result.stations).toHaveLength(0);
  });

  it('get_traffic_by_canton returns ZH stations', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', {
      canton: 'ZH',
    }));
    expect(result.canton).toBe('ZH');
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.stations)).toBe(true);
    expect(result.count).toBeLessThanOrEqual(20);
    expect(result.source).toContain('ASTRA');
  });

  it('get_traffic_by_canton ZH stations are in canton ZH', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', {
      canton: 'ZH',
    }));
    for (const station of result.stations) {
      expect(station.canton).toBe('ZH');
    }
  });

  it('get_traffic_by_canton accepts lowercase canton', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_by_canton', {
      canton: 'be',
    }));
    expect(result.canton).toBe('BE');
    expect(result.count).toBeGreaterThan(0);
  });

  it('get_traffic_by_canton response is under 50K chars', async () => {
    const result = await handleTraffic('get_traffic_by_canton', { canton: 'ZH' });
    expect(result.length).toBeLessThan(50000);
  });

  it('get_traffic_nearby finds stations near Zürich', async () => {
    // Zürich: 47.3769, 8.5417
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.3769,
      lon: 8.5417,
    }));
    expect(result.lat).toBe(47.3769);
    expect(result.lon).toBe(8.5417);
    expect(result.radius_m).toBe(5000);
    expect(Array.isArray(result.stations)).toBe(true);
    expect(result.source).toContain('ASTRA');
  });

  it('get_traffic_nearby station has required fields', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.3769,
      lon: 8.5417,
      radius: 10000,
    }));
    if (result.stations.length > 0) {
      const s = result.stations[0];
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('canton');
      expect(s).toHaveProperty('avgDailyTraffic');
    }
  });

  it('get_traffic_nearby uses custom radius', async () => {
    const result = JSON.parse(await handleTraffic('get_traffic_nearby', {
      lat: 47.3769,
      lon: 8.5417,
      radius: 20000,
    }));
    expect(result.radius_m).toBe(20000);
  });

  it('get_traffic_nearby response is under 50K chars', async () => {
    const result = await handleTraffic('get_traffic_nearby', {
      lat: 47.3769,
      lon: 8.5417,
      radius: 20000,
    });
    expect(result.length).toBeLessThan(50000);
  });
});
