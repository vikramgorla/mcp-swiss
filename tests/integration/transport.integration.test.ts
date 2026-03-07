// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleTransport } from '../../src/modules/transport.js';

describe('Transport API (live)', () => {
  it('search_stations returns slim results for Bern', async () => {
    const result = JSON.parse(await handleTransport('search_stations', { query: 'Bern' }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBeTruthy();
    expect(result[0]).toHaveProperty('lat');
    expect(result[0]).toHaveProperty('lon');
    // Should NOT have raw coordinate object
    expect(result[0].coordinate).toBeUndefined();
  });

  it('get_connections returns slim connections Bern→Zürich', async () => {
    const result = JSON.parse(await handleTransport('get_connections', {
      from: 'Bern',
      to: 'Zürich HB',
      limit: 2,
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const conn = result[0];
    // Slim format: from/to are strings, not objects
    expect(typeof conn.from).toBe('string');
    expect(typeof conn.to).toBe('string');
    expect(conn.duration).toBeTruthy();
    expect(conn.sections).toBeDefined();
  });

  it('get_departures returns slim departures', async () => {
    const result = JSON.parse(await handleTransport('get_departures', {
      station: 'Bern',
      limit: 5,
    }));
    expect(typeof result.station).toBe('string');
    expect(Array.isArray(result.departures)).toBe(true);
    if (result.departures.length > 0) {
      const dep = result.departures[0];
      expect(dep).toHaveProperty('line');
      expect(dep).toHaveProperty('to');
      // Should NOT have passList (that's the bloat)
      expect(dep.passList).toBeUndefined();
    }
    // Response size check: should be well under 50K for 5 departures
    const size = JSON.stringify(result).length;
    expect(size).toBeLessThan(50000);
  });

  it('get_arrivals returns slim arrivals', async () => {
    const result = JSON.parse(await handleTransport('get_arrivals', {
      station: 'Zürich HB',
      limit: 5,
    }));
    expect(typeof result.station).toBe('string');
    expect(Array.isArray(result.arrivals)).toBe(true);
  });

  it('get_nearby_stations returns slim station list', async () => {
    const result = JSON.parse(await handleTransport('get_nearby_stations', {
      x: 7.439122, y: 46.948825,
    }));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('lat');
  });
});
