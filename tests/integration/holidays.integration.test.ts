// These tests hit the real openholidaysapi.org API
// Run with: npx vitest run tests/integration/holidays.integration.test.ts

import { describe, it, expect } from 'vitest';
import { handleHolidays } from '../../src/modules/holidays.js';

describe('Holidays API (live — openholidaysapi.org)', () => {

  // ── get_public_holidays ────────────────────────────────────────────────────

  describe('get_public_holidays', () => {
    it('returns Swiss public holidays for 2026', async () => {
      const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
      expect(result.year).toBe(2026);
      expect(result.canton).toBe('all');
      expect(result.count).toBeGreaterThan(5);
      expect(Array.isArray(result.holidays)).toBe(true);
      expect(result.source).toContain('openholidaysapi.org');
    });

    it('response is under 50K characters', async () => {
      const raw = await handleHolidays('get_public_holidays', { year: 2026 });
      expect(raw.length).toBeLessThan(50000);
    });

    it('each holiday has required fields', async () => {
      const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
      for (const h of result.holidays) {
        expect(h.date).toBeDefined();
        expect(typeof h.name).toBe('string');
        expect(h.name.length).toBeGreaterThan(0);
        expect(typeof h.type).toBe('string');
        expect(typeof h.nationwide).toBe('boolean');
      }
    });

    it('Aug 1 independence/national day is in the list as nationwide', async () => {
      const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
      // API returns it as "Independence Day" (not "Swiss National Day")
      const nationalDay = result.holidays.find(
        (h: { date: string }) => h.date === '2026-08-01'
      );
      expect(nationalDay).toBeDefined();
      expect(nationalDay.nationwide).toBe(true);
    });

    it('New Year Day is in the list', async () => {
      const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
      const newYear = result.holidays.find(
        (h: { name: string }) => h.name === "New Year's Day"
      );
      expect(newYear).toBeDefined();
      expect(newYear.date).toBe('2026-01-01');
    });

    it('canton ZH filter returns fewer or equal holidays than all', async () => {
      const allResult = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
      const zhResult = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026, canton: 'ZH' }));
      expect(zhResult.canton).toBe('ZH');
      expect(zhResult.count).toBeGreaterThan(0);
      expect(zhResult.count).toBeLessThanOrEqual(allResult.count);
    });

    it('canton GE filter returns Geneva-specific holidays', async () => {
      const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026, canton: 'GE' }));
      expect(result.canton).toBe('GE');
      expect(result.count).toBeGreaterThan(0);
    });

    it('canton BE filter response is under 50K chars', async () => {
      const raw = await handleHolidays('get_public_holidays', { year: 2026, canton: 'BE' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('regional holidays include cantons array', async () => {
      const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
      const regional = result.holidays.filter(
        (h: { nationwide: boolean }) => !h.nationwide
      );
      expect(regional.length).toBeGreaterThan(0);
      for (const h of regional) {
        expect(Array.isArray(h.cantons)).toBe(true);
        expect(h.cantons.length).toBeGreaterThan(0);
      }
    });
  });

  // ── get_school_holidays ────────────────────────────────────────────────────

  describe('get_school_holidays', () => {
    it('returns school holidays for 2026', async () => {
      const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026 }));
      expect(result.year).toBe(2026);
      expect(result.canton).toBe('all');
      expect(result.count).toBeGreaterThan(5);
      expect(Array.isArray(result.holidays)).toBe(true);
    });

    it('response is under 50K characters', async () => {
      const raw = await handleHolidays('get_school_holidays', { year: 2026 });
      expect(raw.length).toBeLessThan(50000);
    });

    it('school holidays have date ranges (startDate/endDate)', async () => {
      const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026 }));
      // Most school holidays span multiple days
      const multiDay = result.holidays.filter(
        (h: { date: string }) => h.date.includes('/')
      );
      expect(multiDay.length).toBeGreaterThan(0);
    });

    it('canton ZH filter returns ZH school holidays', async () => {
      const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026, canton: 'ZH' }));
      expect(result.canton).toBe('ZH');
      expect(result.count).toBeGreaterThan(0);
      // All returned holidays should include ZH
      for (const h of result.holidays) {
        if (h.cantons) {
          expect(h.cantons).toContain('ZH');
        }
      }
    });

    it('canton ZH school holiday response is under 50K chars', async () => {
      const raw = await handleHolidays('get_school_holidays', { year: 2026, canton: 'ZH' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('each holiday has name, type=School, and date', async () => {
      const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026, canton: 'ZH' }));
      for (const h of result.holidays) {
        expect(typeof h.name).toBe('string');
        expect(h.type).toBe('School');
        expect(h.date).toBeDefined();
      }
    });
  });

  // ── is_holiday_today ───────────────────────────────────────────────────────

  describe('is_holiday_today', () => {
    it('returns valid response structure', async () => {
      const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
      expect(typeof result.is_holiday).toBe('boolean');
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.canton).toBe('all');
    });

    it('response is under 50K characters', async () => {
      const raw = await handleHolidays('is_holiday_today', {});
      expect(raw.length).toBeLessThan(50000);
    });

    it('canton ZH check returns valid structure', async () => {
      const result = JSON.parse(await handleHolidays('is_holiday_today', { canton: 'ZH' }));
      expect(typeof result.is_holiday).toBe('boolean');
      expect(result.canton).toBe('ZH');
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('if is_holiday=true, has holiday name and type', async () => {
      const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
      if (result.is_holiday) {
        expect(typeof result.holiday).toBe('string');
        expect(result.holiday.length).toBeGreaterThan(0);
        expect(typeof result.type).toBe('string');
        expect(typeof result.nationwide).toBe('boolean');
      }
    });

    it('if is_holiday=false, no holiday field present', async () => {
      const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
      if (!result.is_holiday) {
        expect(result.holiday).toBeUndefined();
      }
    });
  });
});
