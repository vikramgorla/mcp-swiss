// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleGeodata } from '../../src/modules/geodata.js';

describe('Geodata API (live)', () => {
  it('geocode returns slim results for Bundesplatz Bern', async () => {
    const result = JSON.parse(await handleGeodata('geocode', {
      address: 'Bundesplatz 3, Bern',
    }));
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.results)).toBe(true);
    // Slim: should have label, lat, lon — not raw attrs
    const r = result.results[0];
    expect(r).toHaveProperty('label');
    expect(r).toHaveProperty('lat');
    expect(r).toHaveProperty('lon');
    expect(r.attrs).toBeUndefined(); // Should be flattened
  });

  it('geocode coordinates are in Switzerland', async () => {
    const result = JSON.parse(await handleGeodata('geocode', {
      address: 'Bahnhofstrasse 1, Zürich',
    }));
    if (result.results.length > 0) {
      const r = result.results[0];
      expect(r.lat).toBeGreaterThan(45);
      expect(r.lat).toBeLessThan(48);
      expect(r.lon).toBeGreaterThan(5);
      expect(r.lon).toBeLessThan(11);
    }
  });

  it('reverse_geocode returns slim results', async () => {
    const result = JSON.parse(await handleGeodata('reverse_geocode', {
      lat: 46.9480, lng: 7.4474,
    }));
    expect(result.count).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('label');
  });

  it('search_places finds Matterhorn', async () => {
    const result = JSON.parse(await handleGeodata('search_places', {
      query: 'Matterhorn',
    }));
    expect(result.count).toBeGreaterThan(0);
    const found = result.results.find(
      (r: { label?: string }) => r.label?.toLowerCase().includes('matterhorn')
    );
    expect(found).toBeDefined();
  });

  it('get_solar_potential returns buildings with aggregated data', async () => {
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result).toHaveProperty('buildings');
    expect(Array.isArray(result.buildings)).toBe(true);
    expect(result.source).toContain('BFE');
    // Response size: should be well under 50K (was 622K before)
    const size = JSON.stringify(result).length;
    expect(size).toBeLessThan(50000);
    if (result.buildings.length > 0) {
      const b = result.buildings[0];
      expect(b).toHaveProperty('totalElectricity_kWh');
      expect(b).toHaveProperty('totalArea_m2');
    }
  });

  it('identify_location returns slim results', async () => {
    const result = JSON.parse(await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.results)).toBe(true);
    if (result.results.length > 0) {
      expect(result.results[0]).toHaveProperty('layer');
      expect(result.results[0]).toHaveProperty('layerId');
    }
  });

  it('get_municipality finds Bern', async () => {
    const result = JSON.parse(await handleGeodata('get_municipality', { name: 'Bern' }));
    expect(result.count).toBeGreaterThan(0);
  });
});
