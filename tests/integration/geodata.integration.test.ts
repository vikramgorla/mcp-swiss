// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleGeodata } from '../../src/modules/geodata.js';

describe('Geodata API (live)', () => {
  it('geocode returns results for Bundesplatz Bern', async () => {
    const result = JSON.parse(await handleGeodata('geocode', {
      address: 'Bundesplatz 3, Bern',
    }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('geocode result has lat/lon coordinates', async () => {
    const result = JSON.parse(await handleGeodata('geocode', {
      address: 'Bahnhofstrasse 1, Zürich',
    }));
    if (result.results.length > 0) {
      const attrs = result.results[0].attrs;
      expect(typeof attrs.lat).toBe('number');
      expect(typeof attrs.lon).toBe('number');
      // Should be roughly in Switzerland
      expect(attrs.lat).toBeGreaterThan(45);
      expect(attrs.lat).toBeLessThan(48);
      expect(attrs.lon).toBeGreaterThan(5);
      expect(attrs.lon).toBeLessThan(11);
    }
  });

  it('reverse_geocode returns results for Bern coordinates', async () => {
    const result = JSON.parse(await handleGeodata('reverse_geocode', {
      lat: 46.9480, lng: 7.4474,
    }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('search_places finds Matterhorn', async () => {
    const result = JSON.parse(await handleGeodata('search_places', {
      query: 'Matterhorn',
    }));
    expect(result).toHaveProperty('results');
    expect(result.results.length).toBeGreaterThan(0);
    const matterhorn = result.results.find(
      (r: { attrs?: { label?: string } }) =>
        r.attrs?.label?.toLowerCase().includes('matterhorn')
    );
    expect(matterhorn).toBeDefined();
  });

  it('get_solar_potential returns identify results', async () => {
    const result = JSON.parse(await handleGeodata('get_solar_potential', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('identify_location returns geographic features', async () => {
    const result = JSON.parse(await handleGeodata('identify_location', {
      lat: 46.946774, lng: 7.444192,
    }));
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('get_municipality finds Bern', async () => {
    const result = JSON.parse(await handleGeodata('get_municipality', { name: 'Bern' }));
    expect(result).toHaveProperty('results');
    expect(result.results.length).toBeGreaterThan(0);
  });
});
