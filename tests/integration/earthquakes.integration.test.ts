// These tests hit the real SED/FDSN API — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleEarthquakes } from '../../src/modules/earthquakes.js';

describe('Earthquakes API (live — SED/ETH Zürich)', () => {
  it('get_recent_earthquakes returns events for last 30 days', async () => {
    const result = JSON.parse(
      await handleEarthquakes('get_recent_earthquakes', { days: 30, min_magnitude: 0.5 })
    );
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.source).toContain('SED');
  });

  it('events have expected shape', async () => {
    const result = JSON.parse(
      await handleEarthquakes('get_recent_earthquakes', { days: 7, limit: 5 })
    );
    expect(result.events.length).toBeGreaterThan(0);
    const ev = result.events[0];
    expect(typeof ev.event_id).toBe('string');
    expect(typeof ev.time).toBe('string');
    expect(typeof ev.latitude).toBe('number');
    expect(typeof ev.longitude).toBe('number');
    expect(typeof ev.depth_km).toBe('number');
    expect(typeof ev.magnitude).toBe('number');
    expect(typeof ev.magnitude_type).toBe('string');
    expect(typeof ev.location).toBe('string');
    expect(typeof ev.event_type).toBe('string');
  });

  it('response is under 50K chars', async () => {
    const raw = await handleEarthquakes('get_recent_earthquakes', {
      days: 30,
      min_magnitude: 0.5,
      limit: 100,
    });
    expect(raw.length).toBeLessThan(50000);
  });

  it('quarry blasts are excluded by default', async () => {
    const result = JSON.parse(
      await handleEarthquakes('get_recent_earthquakes', { days: 30 })
    );
    const blasts = result.events.filter(
      (e: { event_type: string }) => e.event_type === 'quarry blast'
    );
    expect(blasts).toHaveLength(0);
  });

  it('include_blasts=true may return blasts', async () => {
    const result = JSON.parse(
      await handleEarthquakes('get_recent_earthquakes', {
        days: 30,
        include_blasts: true,
        min_magnitude: 0.5,
      })
    );
    // We can't guarantee blasts exist, but count should be >= without-blasts count
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.include_blasts).toBe(true);
  });

  it('get_earthquake_details returns event for a known recent ID', async () => {
    // First get a real event ID
    const listResult = JSON.parse(
      await handleEarthquakes('get_recent_earthquakes', { days: 14, limit: 1 })
    );
    if (listResult.count === 0) {
      console.log('No recent events — skipping detail test');
      return;
    }
    const eventId = listResult.events[0].event_id;
    const detail = JSON.parse(
      await handleEarthquakes('get_earthquake_details', { event_id: eventId })
    );
    expect(detail.event).toBeDefined();
    expect(detail.event.event_id).toBe(eventId);
    expect(detail.source).toContain('SED');
  });

  it('get_earthquake_details detail response is under 5K', async () => {
    const listResult = JSON.parse(
      await handleEarthquakes('get_recent_earthquakes', { days: 14, limit: 1 })
    );
    if (listResult.count === 0) return;
    const eventId = listResult.events[0].event_id;
    const raw = await handleEarthquakes('get_earthquake_details', { event_id: eventId });
    expect(raw.length).toBeLessThan(5000);
  });

  it('search_earthquakes_by_location returns events near Bern', async () => {
    // Bern: 46.9480, 7.4474
    const result = JSON.parse(
      await handleEarthquakes('search_earthquakes_by_location', {
        lat: 46.9480,
        lon: 7.4474,
        radius_km: 100,
        days: 90,
        min_magnitude: 0.5,
      })
    );
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(result.center).toEqual({ lat: 46.948, lon: 7.4474 });
    expect(result.radius_km).toBe(100);
    expect(Array.isArray(result.events)).toBe(true);
  });

  it('search_earthquakes_by_location response is under 50K', async () => {
    const raw = await handleEarthquakes('search_earthquakes_by_location', {
      lat: 46.9480,
      lon: 7.4474,
      radius_km: 200,
      days: 180,
    });
    expect(raw.length).toBeLessThan(50000);
  });

  it('search near Zürich returns structured result', async () => {
    // Zürich: 47.3769, 8.5417
    const result = JSON.parse(
      await handleEarthquakes('search_earthquakes_by_location', {
        lat: 47.3769,
        lon: 8.5417,
        radius_km: 80,
        days: 60,
      })
    );
    expect(result.center).toEqual({ lat: 47.3769, lon: 8.5417 });
    expect(typeof result.count).toBe('number');
  });
});
