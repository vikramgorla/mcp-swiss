// Integration tests for SNB Exchange Rates module — hits real SNB API
// Run with: npm run test:integration -- tests/integration/snb.integration.test.ts
import { describe, it, expect } from 'vitest';
import {
  handleListCurrencies,
  handleGetExchangeRate,
  handleGetExchangeRateHistory,
} from '../../src/modules/snb.js';

const TIMEOUT = 20000;

describe('SNB Exchange Rates API (live)', () => {
  // ── list_currencies ────────────────────────────────────────────────────────

  describe('list_currencies', () => {
    it('returns list of currencies', async () => {
      const result = JSON.parse(await handleListCurrencies());
      expect(Array.isArray(result.currencies)).toBe(true);
      expect(result.currencies.length).toBeGreaterThan(10);
    }, TIMEOUT);

    it('includes EUR, USD, GBP, JPY', async () => {
      const result = JSON.parse(await handleListCurrencies());
      const codes = result.currencies.map((c: { code: string }) => c.code);
      expect(codes).toContain('EUR');
      expect(codes).toContain('USD');
      expect(codes).toContain('GBP');
      expect(codes).toContain('JPY');
    }, TIMEOUT);

    it('includes currency names and regions', async () => {
      const result = JSON.parse(await handleListCurrencies());
      for (const c of result.currencies) {
        expect(c.code).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.seriesId).toBeTruthy();
      }
    }, TIMEOUT);

    it('includes count matching array length', async () => {
      const result = JSON.parse(await handleListCurrencies());
      expect(result.count).toBe(result.currencies.length);
    }, TIMEOUT);

    it('response is under 50K chars', async () => {
      const raw = await handleListCurrencies();
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);
  });

  // ── get_exchange_rate ──────────────────────────────────────────────────────

  describe('get_exchange_rate', () => {
    it('returns current EUR/CHF rate', async () => {
      const result = JSON.parse(await handleGetExchangeRate('EUR'));
      expect(result.currency).toBe('EUR');
      expect(typeof result.rate).toBe('number');
      expect(result.rate).toBeGreaterThan(0);
      expect(result.rate).toBeLessThan(10); // sanity check
    }, TIMEOUT);

    it('returns current USD/CHF rate', async () => {
      const result = JSON.parse(await handleGetExchangeRate('USD'));
      expect(result.currency).toBe('USD');
      expect(typeof result.rate).toBe('number');
      expect(result.rate).toBeGreaterThan(0);
      expect(result.rate).toBeLessThan(10);
    }, TIMEOUT);

    it('returns current JPY/CHF rate (per 100 JPY)', async () => {
      const result = JSON.parse(await handleGetExchangeRate('JPY'));
      expect(result.currency).toBe('JPY');
      expect(result.units).toBe(100);
      expect(typeof result.rate).toBe('number');
      expect(result.rate).toBeGreaterThan(0);
    }, TIMEOUT);

    it('returns current GBP/CHF rate', async () => {
      const result = JSON.parse(await handleGetExchangeRate('GBP'));
      expect(result.currency).toBe('GBP');
      expect(result.rate).toBeGreaterThan(0);
    }, TIMEOUT);

    it('includes a recent date (within last 6 months)', async () => {
      const result = JSON.parse(await handleGetExchangeRate('EUR'));
      // Date is YYYY-MM format
      expect(result.date).toMatch(/^\d{4}-\d{2}$/);
      const [year] = result.date.split('-').map(Number);
      expect(year).toBeGreaterThanOrEqual(2025);
    }, TIMEOUT);

    it('includes description and note', async () => {
      const result = JSON.parse(await handleGetExchangeRate('EUR'));
      expect(result.description).toBeTruthy();
      expect(result.note).toBeTruthy();
      expect(result.note).toContain('monthly average');
    }, TIMEOUT);

    it('includes source link', async () => {
      const result = JSON.parse(await handleGetExchangeRate('EUR'));
      expect(result.source).toContain('snb.ch');
    }, TIMEOUT);

    it('handles lowercase currency input', async () => {
      const result = JSON.parse(await handleGetExchangeRate('eur'));
      expect(result.currency).toBe('EUR');
      expect(result.rate).toBeGreaterThan(0);
    }, TIMEOUT);

    it('throws for invalid currency code', async () => {
      await expect(handleGetExchangeRate('XYZ')).rejects.toThrow();
    }, TIMEOUT);

    it('response is under 50K chars', async () => {
      const raw = await handleGetExchangeRate('USD');
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);
  });

  // ── get_exchange_rate_history ──────────────────────────────────────────────

  describe('get_exchange_rate_history', () => {
    it('returns history for EUR (default 90 months)', async () => {
      const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
      expect(Array.isArray(result.history)).toBe(true);
      expect(result.history.length).toBeGreaterThan(0);
      expect(result.history.length).toBeLessThanOrEqual(90);
    }, TIMEOUT);

    it('history entries have date and rate', async () => {
      const result = JSON.parse(await handleGetExchangeRateHistory('USD'));
      for (const entry of result.history) {
        expect(entry.date).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof entry.rate).toBe('number');
        expect(entry.rate).toBeGreaterThan(0);
      }
    }, TIMEOUT);

    it('filters correctly with from date', async () => {
      const result = JSON.parse(await handleGetExchangeRateHistory('EUR', '2023-01'));
      for (const entry of result.history) {
        expect(entry.date >= '2023-01').toBe(true);
      }
    }, TIMEOUT);

    it('filters correctly with to date', async () => {
      const result = JSON.parse(
        await handleGetExchangeRateHistory('EUR', undefined, '2023-12')
      );
      for (const entry of result.history) {
        expect(entry.date <= '2023-12').toBe(true);
      }
    }, TIMEOUT);

    it('filters correctly with both from and to', async () => {
      const result = JSON.parse(
        await handleGetExchangeRateHistory('EUR', '2022-01', '2022-12')
      );
      expect(result.history.length).toBeGreaterThan(0);
      expect(result.history.length).toBeLessThanOrEqual(12);
      for (const entry of result.history) {
        expect(entry.date >= '2022-01').toBe(true);
        expect(entry.date <= '2022-12').toBe(true);
      }
    }, TIMEOUT);

    it('includes stats with min, max, average', async () => {
      const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
      expect(result.stats).toBeTruthy();
      expect(typeof result.stats.min).toBe('number');
      expect(typeof result.stats.max).toBe('number');
      expect(typeof result.stats.average).toBe('number');
      expect(result.stats.min).toBeLessThanOrEqual(result.stats.average);
      expect(result.stats.average).toBeLessThanOrEqual(result.stats.max);
    }, TIMEOUT);

    it('includes from/to date range in response', async () => {
      const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
      expect(result.from).toMatch(/^\d{4}-\d{2}$/);
      expect(result.to).toMatch(/^\d{4}-\d{2}$/);
      expect(result.to >= result.from).toBe(true);
    }, TIMEOUT);

    it('works for JPY (per-100-unit currency)', async () => {
      const result = JSON.parse(await handleGetExchangeRateHistory('JPY'));
      expect(result.units).toBe(100);
      expect(result.unitDescription).toContain('100');
      expect(result.history.length).toBeGreaterThan(0);
    }, TIMEOUT);

    it('response is under 50K chars for 90-month window', async () => {
      const raw = await handleGetExchangeRateHistory('EUR');
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);

    it('response is under 50K chars for full EUR history (from 2000)', async () => {
      const raw = await handleGetExchangeRateHistory('EUR', '2000-01');
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);

    it('throws for invalid currency code', async () => {
      await expect(handleGetExchangeRateHistory('XYZ')).rejects.toThrow();
    }, TIMEOUT);
  });
});
