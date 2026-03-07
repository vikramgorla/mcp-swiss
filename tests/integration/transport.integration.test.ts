// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleTransport } from '../../src/modules/transport.js';

describe('Transport API (live)', () => {
  it('search_stations returns results for Bern', async () => {
    const result = JSON.parse(await handleTransport('search_stations', { query: 'Bern' }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBeTruthy();
    const bern = result.find((s: { name: string }) => s.name.toLowerCase().includes('bern'));
    expect(bern).toBeDefined();
  });

  it('search_stations by coordinates returns nearby stations', async () => {
    // Bern coordinates
    const result = JSON.parse(await handleTransport('search_stations', {
      x: 7.439122, y: 46.948825,
    }));
    expect(Array.isArray(result)).toBe(true);
  });

  it('get_connections finds Bern→Zürich trains', async () => {
    const result = JSON.parse(await handleTransport('get_connections', {
      from: 'Bern',
      to: 'Zürich HB',
      limit: 2,
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const conn = result[0];
    expect(conn.from?.station?.name).toBeTruthy();
    expect(conn.to?.station?.name).toBeTruthy();
    expect(conn.duration).toBeTruthy();
  });

  it('get_departures returns departures from Bern', async () => {
    const result = JSON.parse(await handleTransport('get_departures', {
      station: 'Bern',
      limit: 5,
    }));
    expect(result).toHaveProperty('station');
    expect(result).toHaveProperty('departures');
    expect(Array.isArray(result.departures)).toBe(true);
  });

  it('get_arrivals returns arrivals at Zürich HB', async () => {
    const result = JSON.parse(await handleTransport('get_arrivals', {
      station: 'Zürich HB',
      limit: 5,
    }));
    expect(result).toHaveProperty('arrivals');
    expect(Array.isArray(result.arrivals)).toBe(true);
  });

  it('get_nearby_stations returns stations near Bern', async () => {
    const result = JSON.parse(await handleTransport('get_nearby_stations', {
      x: 7.439122, y: 46.948825,
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
