// These tests hit the real openerz.metaodi.ch API
// Run with: npx vitest run tests/integration/recycling.integration.test.ts

import { describe, it, expect } from 'vitest';
import { handleRecycling } from '../../src/modules/recycling.js';

describe('Recycling API (live — openerz.metaodi.ch)', () => {

  // ── get_waste_collection ──────────────────────────────────────────────────

  describe('get_waste_collection', () => {
    it('returns upcoming collections for ZIP 8001', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
      expect(result.zip).toBe('8001');
      expect(result.type).toBe('all');
      expect(Array.isArray(result.upcoming)).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.source).toContain('openerz');
    });

    it('response is under 50K characters', async () => {
      const raw = await handleRecycling('get_waste_collection', { zip: '8001' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('each entry has date, waste_type, zip', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
      for (const entry of result.upcoming) {
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof entry.waste_type).toBe('string');
        expect(entry.waste_type.length).toBeGreaterThan(0);
        expect(typeof entry.zip).toBe('number');
      }
    });

    it('dates are sorted ascending', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
      const dates = result.upcoming.map((e: { date: string }) => e.date);
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);
    });

    it('cardboard type filter works', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', type: 'cardboard' }));
      expect(result.type).toBe('cardboard');
      for (const entry of result.upcoming) {
        expect(entry.waste_type).toBe('cardboard');
      }
    });

    it('limit parameter is respected', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', limit: 3 }));
      expect(result.upcoming.length).toBeLessThanOrEqual(3);
    });

    it('default limit is 5', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
      expect(result.upcoming.length).toBeLessThanOrEqual(5);
    });

    it('ZIP 8004 also returns valid data', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8004' }));
      expect(result.zip).toBe('8004');
      expect(Array.isArray(result.upcoming)).toBe(true);
    });

    it('ZIP 8032 (Zürichberg) also returns valid data', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8032' }));
      expect(result.zip).toBe('8032');
      expect(Array.isArray(result.upcoming)).toBe(true);
    });

    it('response includes note about Zurich coverage', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
      expect(result.note).toContain('8001');
    });
  });

  // ── list_waste_types ──────────────────────────────────────────────────────

  describe('list_waste_types', () => {
    it('returns types array with at least 6 entries', async () => {
      const result = JSON.parse(await handleRecycling('list_waste_types', {}));
      expect(Array.isArray(result.types)).toBe(true);
      expect(result.types.length).toBeGreaterThanOrEqual(6);
    });

    it('response is under 50K characters', async () => {
      const raw = await handleRecycling('list_waste_types', {});
      expect(raw.length).toBeLessThan(50000);
    });

    it('includes waste, cardboard, paper, organic', async () => {
      const result = JSON.parse(await handleRecycling('list_waste_types', {}));
      const types = result.types.map((t: { type: string }) => t.type);
      expect(types).toContain('waste');
      expect(types).toContain('cardboard');
      expect(types).toContain('paper');
      expect(types).toContain('organic');
    });

    it('each type has a non-empty description', async () => {
      const result = JSON.parse(await handleRecycling('list_waste_types', {}));
      for (const t of result.types) {
        expect(typeof t.description).toBe('string');
        expect(t.description.length).toBeGreaterThan(0);
      }
    });

    it('count matches number of types', async () => {
      const result = JSON.parse(await handleRecycling('list_waste_types', {}));
      expect(result.count).toBe(result.types.length);
    });
  });

  // ── get_waste_calendar ────────────────────────────────────────────────────

  describe('get_waste_calendar', () => {
    it('returns a monthly calendar for ZIP 8001', async () => {
      const now = new Date();
      const result = JSON.parse(
        await handleRecycling('get_waste_calendar', { zip: '8001' })
      );
      expect(result.zip).toBe('8001');
      expect(result.month).toBe(now.getMonth() + 1);
      expect(result.year).toBe(now.getFullYear());
      expect(Array.isArray(result.calendar)).toBe(true);
      expect(result.source).toContain('openerz');
    });

    it('response is under 50K characters', async () => {
      const raw = await handleRecycling('get_waste_calendar', { zip: '8001' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('calendar entries have date and types array', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001' }));
      for (const day of result.calendar) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Array.isArray(day.types)).toBe(true);
        expect(day.types.length).toBeGreaterThan(0);
      }
    });

    it('calendar is sorted by date', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001' }));
      const dates = result.calendar.map((d: { date: string }) => d.date);
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);
    });

    it('all calendar dates are within the requested month', async () => {
      const result = JSON.parse(
        await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 })
      );
      for (const day of result.calendar) {
        expect(day.date).toMatch(/^2026-03-/);
      }
    });

    it('returns total_events >= collection_days', async () => {
      const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001' }));
      expect(result.total_events).toBeGreaterThanOrEqual(result.collection_days);
    });

    it('month_name is a valid month string', async () => {
      const result = JSON.parse(
        await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 })
      );
      expect(result.month_name).toBe('March');
    });

    it('ZIP 8004 monthly calendar returns valid data', async () => {
      const result = JSON.parse(
        await handleRecycling('get_waste_calendar', { zip: '8004', month: 3, year: 2026 })
      );
      expect(result.zip).toBe('8004');
      expect(Array.isArray(result.calendar)).toBe(true);
    });

    it('future month returns data', async () => {
      const result = JSON.parse(
        await handleRecycling('get_waste_calendar', { zip: '8001', month: 6, year: 2026 })
      );
      expect(result.month).toBe(6);
      expect(result.year).toBe(2026);
      expect(Array.isArray(result.calendar)).toBe(true);
    });
  });
});
