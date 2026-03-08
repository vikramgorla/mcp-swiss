import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  handleListCurrencies,
  handleGetExchangeRate,
  handleGetExchangeRateHistory,
  parseSnbCsv,
  flattenCurrencies,
} from '../../src/modules/snb.js';
import {
  mockDimensionsResponse,
  mockCsvResponse,
  mockCsvWithMissingValues,
  mockCsvSingleEntry,
  mockCsvEmpty,
} from '../fixtures/snb.js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

/**
 * Mock both fetch calls:
 * - First call (dimensions JSON endpoint) → returns dimensionsPayload
 * - Second call (CSV endpoint) → returns csvText
 */
function mockBothFetches(dimensionsPayload: unknown, csvText: string) {
  let callCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // dimensions JSON
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(dimensionsPayload),
          text: () => Promise.resolve(JSON.stringify(dimensionsPayload)),
        });
      }
      // CSV
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(csvText),
        json: () => Promise.resolve({}),
      });
    })
  );
}

/** Mock only the JSON dimensions call */
function mockDimensionsFetch(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  }));
}

/** Mock only the CSV fetch call */
function mockCsvFetch(csvText: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Internal Server Error',
    text: () => Promise.resolve(csvText),
    json: () => Promise.resolve({}),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── parseSnbCsv ───────────────────────────────────────────────────────────────

describe('parseSnbCsv', () => {
  it('parses valid CSV and returns a map', () => {
    const map = parseSnbCsv(mockCsvResponse);
    expect(map.has('EUR1')).toBe(true);
    expect(map.has('USD1')).toBe(true);
    expect(map.has('JPY100')).toBe(true);
  });

  it('only includes M0 (monthly average) entries', () => {
    const map = parseSnbCsv(mockCsvResponse);
    const eurEntries = map.get('EUR1')!;
    // M1 entries should not be included
    // M0 EUR1 entries: 2024-01, 2024-02, 2025-01, 2026-01 = 4
    expect(eurEntries).toHaveLength(4);
  });

  it('parses rates as numbers', () => {
    const map = parseSnbCsv(mockCsvResponse);
    const eurEntries = map.get('EUR1')!;
    for (const entry of eurEntries) {
      expect(typeof entry.rate).toBe('number');
      expect(isNaN(entry.rate)).toBe(false);
    }
  });

  it('skips rows with empty value', () => {
    const map = parseSnbCsv(mockCsvWithMissingValues);
    // GBP1 has empty value, should be skipped
    expect(map.has('GBP1')).toBe(false);
    // EUR1 and USD1 should be present
    expect(map.has('EUR1')).toBe(true);
    expect(map.has('USD1')).toBe(true);
  });

  it('returns empty map for CSV with no data rows', () => {
    const map = parseSnbCsv(mockCsvEmpty);
    expect(map.size).toBe(0);
  });

  it('returns correct latest date for EUR1', () => {
    const map = parseSnbCsv(mockCsvResponse);
    const entries = map.get('EUR1')!;
    expect(entries[entries.length - 1].date).toBe('2026-01');
  });

  it('parses per-100-unit currencies correctly', () => {
    const map = parseSnbCsv(mockCsvResponse);
    const jpyEntries = map.get('JPY100')!;
    expect(jpyEntries[0].date).toBe('2024-01');
    expect(jpyEntries[0].rate).toBeCloseTo(0.61234);
  });

  it('handles minimal CSV with single entry', () => {
    const map = parseSnbCsv(mockCsvSingleEntry);
    expect(map.size).toBe(1);
    expect(map.has('EUR1')).toBe(true);
    expect(map.get('EUR1')![0].rate).toBeCloseTo(0.93882);
  });
});

// ── flattenCurrencies ─────────────────────────────────────────────────────────

describe('flattenCurrencies', () => {
  it('flattens nested regions into flat array', () => {
    const d1 = mockDimensionsResponse.dimensions.find((d) => d.id === 'D1')!;
    const currencies = flattenCurrencies(d1.dimensionItems, '');
    // EUR1 + GBP1 + SEK100 + USD1 + CAD1 + JPY100 + AUD1 = 7
    expect(currencies).toHaveLength(7);
  });

  it('extracts correct currency code from seriesId', () => {
    const d1 = mockDimensionsResponse.dimensions.find((d) => d.id === 'D1')!;
    const currencies = flattenCurrencies(d1.dimensionItems, '');

    const eur = currencies.find((c) => c.seriesId === 'EUR1');
    expect(eur?.code).toBe('EUR');
    expect(eur?.units).toBe(1);

    const jpy = currencies.find((c) => c.seriesId === 'JPY100');
    expect(jpy?.code).toBe('JPY');
    expect(jpy?.units).toBe(100);

    const sek = currencies.find((c) => c.seriesId === 'SEK100');
    expect(sek?.code).toBe('SEK');
    expect(sek?.units).toBe(100);
  });

  it('assigns region from parent group', () => {
    const d1 = mockDimensionsResponse.dimensions.find((d) => d.id === 'D1')!;
    const currencies = flattenCurrencies(d1.dimensionItems, '');

    const eur = currencies.find((c) => c.code === 'EUR');
    expect(eur?.region).toBe('Europe');

    const usd = currencies.find((c) => c.code === 'USD');
    expect(usd?.region).toBe('America');

    const jpy = currencies.find((c) => c.code === 'JPY');
    expect(jpy?.region).toBe('Asia and Australia');
  });

  it('preserves full name from dimensions', () => {
    const d1 = mockDimensionsResponse.dimensions.find((d) => d.id === 'D1')!;
    const currencies = flattenCurrencies(d1.dimensionItems, '');

    const gbp = currencies.find((c) => c.code === 'GBP');
    expect(gbp?.name).toContain('United Kingdom');

    const jpy = currencies.find((c) => c.code === 'JPY');
    expect(jpy?.name).toContain('Japan');
  });
});

// ── handleListCurrencies ──────────────────────────────────────────────────────

describe('handleListCurrencies', () => {
  it('returns array of currencies', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    expect(Array.isArray(result.currencies)).toBe(true);
    expect(result.currencies.length).toBeGreaterThan(0);
  });

  it('includes currency code, name, and region', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    const eur = result.currencies.find((c: { code: string }) => c.code === 'EUR');
    expect(eur).toBeTruthy();
    expect(eur.name).toContain('EUR');
    expect(eur.region).toBe('Europe');
  });

  it('includes count', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    expect(result.count).toBe(result.currencies.length);
  });

  it('includes source link', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    expect(result.source).toContain('snb.ch');
  });

  it('includes informational note', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    expect(result.note).toBeTruthy();
  });

  it('includes seriesId for each currency', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    for (const c of result.currencies) {
      expect(c.seriesId).toBeTruthy();
    }
  });

  it('includes units description for per-100 currencies', async () => {
    mockDimensionsFetch(mockDimensionsResponse);
    const result = JSON.parse(await handleListCurrencies());
    const jpy = result.currencies.find((c: { code: string }) => c.code === 'JPY');
    expect(jpy.units).toContain('100');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('fail')),
      text: () => Promise.resolve(''),
    }));
    await expect(handleListCurrencies()).rejects.toThrow('HTTP 500');
  });
});

// ── handleGetExchangeRate ─────────────────────────────────────────────────────

describe('handleGetExchangeRate', () => {
  it('returns current rate for EUR', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('EUR'));
    expect(result.currency).toBe('EUR');
    expect(typeof result.rate).toBe('number');
    expect(result.rate).toBeGreaterThan(0);
  });

  it('returns the latest date entry', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('EUR'));
    expect(result.date).toBe('2026-01');
    expect(result.rate).toBeCloseTo(0.93882);
  });

  it('handles lowercase currency code', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('eur'));
    expect(result.currency).toBe('EUR');
    expect(result.rate).toBeGreaterThan(0);
  });

  it('includes currency name', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('EUR'));
    expect(result.currencyName).toBeTruthy();
    expect(result.currencyName).toContain('EUR');
  });

  it('includes units field', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('EUR'));
    expect(result.units).toBe(1);
  });

  it('includes correct units for JPY (per 100)', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('JPY'));
    expect(result.units).toBe(100);
    expect(result.description).toContain('100');
  });

  it('includes description and note', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('USD'));
    expect(result.description).toBeTruthy();
    expect(result.note).toBeTruthy();
  });

  it('includes source link', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRate('EUR'));
    expect(result.source).toContain('snb.ch');
  });

  it('throws for unknown currency', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    await expect(handleGetExchangeRate('XYZ')).rejects.toThrow("Currency 'XYZ' not found");
  });

  it('throws when currency is empty string', async () => {
    await expect(handleGetExchangeRate('')).rejects.toThrow('currency is required');
  });

  it('returns no-data response when CSV has no entries for currency', async () => {
    // CSV only has EUR1, but we ask for GBP
    mockBothFetches(mockDimensionsResponse, mockCsvSingleEntry);
    const result = JSON.parse(await handleGetExchangeRate('GBP'));
    expect(result.error).toBeTruthy();
    expect(result.currency).toBe('GBP');
  });

  it('throws on CSV HTTP error', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockDimensionsResponse),
          text: () => Promise.resolve(JSON.stringify(mockDimensionsResponse)),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({}),
      });
    }));
    await expect(handleGetExchangeRate('EUR')).rejects.toThrow('HTTP 503');
  });
});

// ── handleGetExchangeRateHistory ──────────────────────────────────────────────

describe('handleGetExchangeRateHistory', () => {
  it('returns history array for EUR', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    expect(Array.isArray(result.history)).toBe(true);
    expect(result.history.length).toBeGreaterThan(0);
  });

  it('each history entry has date and rate', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    for (const entry of result.history) {
      expect(entry.date).toBeTruthy();
      expect(typeof entry.rate).toBe('number');
    }
  });

  it('filters by from date', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR', '2025-01'));
    for (const entry of result.history) {
      expect(entry.date >= '2025-01').toBe(true);
    }
  });

  it('filters by to date', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR', undefined, '2024-02'));
    for (const entry of result.history) {
      expect(entry.date <= '2024-02').toBe(true);
    }
  });

  it('filters by both from and to dates', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR', '2024-01', '2024-02'));
    expect(result.history.length).toBe(2);
    expect(result.history[0].date).toBe('2024-01');
    expect(result.history[1].date).toBe('2024-02');
  });

  it('limits to 90 entries when no date range provided', async () => {
    // Generate CSV with 120 months of EUR1 data
    let csv = '"CubeId";"devkum"\n"PublishingDate";"2026-03-02 14:30"\n\n"Date";"D0";"D1";"Value"\n';
    for (let i = 0; i < 120; i++) {
      const year = 2015 + Math.floor(i / 12);
      const month = String((i % 12) + 1).padStart(2, '0');
      csv += `"${year}-${month}";"M0";"EUR1";"0.9${i % 10}"\n`;
    }
    mockBothFetches(mockDimensionsResponse, csv);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    expect(result.history.length).toBe(90);
    // Should be the last 90 entries
    expect(result.count).toBe(90);
  });

  it('does not limit when from/to range specified', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    // All 4 EUR1 M0 entries are in range
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR', '2024-01', '2026-12'));
    expect(result.history.length).toBe(4);
  });

  it('includes stats (min, max, average)', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    expect(result.stats).toBeTruthy();
    expect(typeof result.stats.min).toBe('number');
    expect(typeof result.stats.max).toBe('number');
    expect(typeof result.stats.average).toBe('number');
    expect(result.stats.min).toBeLessThanOrEqual(result.stats.max);
  });

  it('includes from/to in response', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    expect(result.from).toBeTruthy();
    expect(result.to).toBeTruthy();
  });

  it('includes count', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    expect(result.count).toBe(result.history.length);
  });

  it('includes currency name and unit description', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('JPY'));
    expect(result.currencyName).toBeTruthy();
    expect(result.unitDescription).toContain('100');
  });

  it('includes source link', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR'));
    expect(result.source).toContain('snb.ch');
  });

  it('throws for unknown currency', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    await expect(handleGetExchangeRateHistory('XYZ')).rejects.toThrow("Currency 'XYZ' not found");
  });

  it('throws when currency is empty string', async () => {
    await expect(handleGetExchangeRateHistory('')).rejects.toThrow('currency is required');
  });

  it('returns no-data error when CSV has no entries for currency', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvSingleEntry);
    const result = JSON.parse(await handleGetExchangeRateHistory('GBP'));
    expect(result.error).toBeTruthy();
  });

  it('returns range error when date filter excludes all entries', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvSingleEntry);
    // Only 2026-01 exists, ask for 2099
    const result = JSON.parse(await handleGetExchangeRateHistory('EUR', '2099-01', '2099-12'));
    expect(result.error).toBeTruthy();
    expect(result.from).toBe('2099-01');
  });

  it('handles lowercase currency code', async () => {
    mockBothFetches(mockDimensionsResponse, mockCsvResponse);
    const result = JSON.parse(await handleGetExchangeRateHistory('usd'));
    expect(result.currency).toBe('USD');
  });
});
