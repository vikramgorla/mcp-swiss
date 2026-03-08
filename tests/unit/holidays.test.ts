import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleHolidays } from '../../src/modules/holidays.js';
import {
  mockPublicHolidaysAll,
  mockPublicHolidaysZH,
  mockSchoolHolidaysAll,
  mockSchoolHolidaysZH,
  mockHolidayTodayNational,
  mockHolidayTodayRegional,
  mockHolidayTodayEmpty,
} from '../fixtures/holidays.js';

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(payload),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── get_public_holidays ──────────────────────────────────────────────────────

describe('get_public_holidays', () => {
  it('returns year, count and holidays array', async () => {
    mockFetch(mockPublicHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
    expect(result.year).toBe(2026);
    expect(result.canton).toBe('all');
    expect(result.count).toBe(5);
    expect(Array.isArray(result.holidays)).toBe(true);
    expect(result.source).toContain('openholidaysapi.org');
  });

  it('each holiday has date, name, type, nationwide', async () => {
    mockFetch(mockPublicHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
    const h = result.holidays[0];
    expect(h.date).toBe('2026-01-01');
    expect(h.name).toBe("New Year's Day");
    expect(h.type).toBe('Public');
    expect(h.nationwide).toBe(true);
  });

  it('regional holiday includes cantons array', async () => {
    mockFetch(mockPublicHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
    const berchtold = result.holidays.find((h: { name: string }) => h.name === "Berchtold's Day");
    expect(Array.isArray(berchtold.cantons)).toBe(true);
    expect(berchtold.cantons).toContain('BE');
  });

  it('nationwide holiday has no cantons field', async () => {
    mockFetch(mockPublicHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
    const newYear = result.holidays[0];
    expect(newYear.nationwide).toBe(true);
    expect(newYear.cantons).toBeUndefined();
  });

  it('canton filter changes canton in output and passes subdivisionCode to URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockPublicHolidaysZH),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026, canton: 'ZH' }));
    expect(result.canton).toBe('ZH');
    expect(result.count).toBe(3);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('subdivisionCode=CH-ZH');
  });

  it('canton code with CH- prefix passes through unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockPublicHolidaysZH),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleHolidays('get_public_holidays', { year: 2026, canton: 'CH-ZH' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('subdivisionCode=CH-ZH');
  });

  it('passes year as date range to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockPublicHolidaysAll),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleHolidays('get_public_holidays', { year: 2026 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('validFrom=2026-01-01');
    expect(calledUrl).toContain('validTo=2026-12-31');
    expect(calledUrl).toContain('countryIsoCode=CH');
    expect(calledUrl).toContain('languageIsoCode=EN');
  });

  it('multi-day holiday uses startDate/endDate range format', async () => {
    mockFetch(mockSchoolHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026 }));
    const winter = result.holidays[0];
    expect(winter.date).toContain('/');
    expect(winter.date).toBe('2025-12-20/2026-01-04');
  });

  it('throws HTTP error on non-200 response', async () => {
    mockFetch(null, 500);
    await expect(handleHolidays('get_public_holidays', { year: 2026 }))
      .rejects.toThrow('HTTP 500');
  });

  it('returns empty holidays array when API returns empty list', async () => {
    mockFetch([]);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2099 }));
    expect(result.count).toBe(0);
    expect(result.holidays).toEqual([]);
  });
});

// ── get_school_holidays ──────────────────────────────────────────────────────

describe('get_school_holidays', () => {
  it('returns year, count and holidays array', async () => {
    mockFetch(mockSchoolHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026 }));
    expect(result.year).toBe(2026);
    expect(result.canton).toBe('all');
    expect(result.count).toBe(4);
    expect(Array.isArray(result.holidays)).toBe(true);
  });

  it('canton filter passes subdivisionCode to URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockSchoolHolidaysZH),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026, canton: 'ZH' }));
    expect(result.canton).toBe('ZH');
    expect(result.count).toBe(2);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('subdivisionCode=CH-ZH');
    expect(calledUrl).toContain('SchoolHolidays');
  });

  it('holidays include cantons shortNames', async () => {
    mockFetch(mockSchoolHolidaysAll);
    const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2026 }));
    const spring = result.holidays.find((h: { name: string }) => h.name === 'Spring holidays');
    expect(spring.cantons).toContain('ZH');
    expect(spring.cantons).toContain('BE');
  });

  it('throws HTTP error on 404', async () => {
    mockFetch(null, 404);
    await expect(handleHolidays('get_school_holidays', { year: 2026 }))
      .rejects.toThrow('HTTP 404');
  });

  it('returns empty holidays when API returns empty list', async () => {
    mockFetch([]);
    const result = JSON.parse(await handleHolidays('get_school_holidays', { year: 2099 }));
    expect(result.count).toBe(0);
    expect(result.holidays).toEqual([]);
  });
});

// ── is_holiday_today ─────────────────────────────────────────────────────────

describe('is_holiday_today', () => {
  it('returns is_holiday=true with holiday name for national holiday', async () => {
    mockFetch(mockHolidayTodayNational);
    const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
    expect(result.is_holiday).toBe(true);
    expect(result.holiday).toBe('Independence Day');
    expect(result.nationwide).toBe(true);
    expect(result.canton).toBe('all');
  });

  it('returns is_holiday=false when no holidays today', async () => {
    mockFetch(mockHolidayTodayEmpty);
    const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
    expect(result.is_holiday).toBe(false);
    expect(result.holiday).toBeUndefined();
    expect(result.date).toBeDefined();
  });

  it('passes canton to subdivisionCode in URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockHolidayTodayRegional),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = JSON.parse(await handleHolidays('is_holiday_today', { canton: 'ZH' }));
    expect(result.canton).toBe('ZH');
    expect(result.is_holiday).toBe(true);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('subdivisionCode=CH-ZH');
  });

  it('uses today date as both validFrom and validTo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockHolidayTodayEmpty),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleHolidays('is_holiday_today', {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const today = new Date().toISOString().slice(0, 10);
    expect(calledUrl).toContain(`validFrom=${today}`);
    expect(calledUrl).toContain(`validTo=${today}`);
  });

  it('prefers nationwide holiday when both national and regional match', async () => {
    // List has regional first, then national
    const mixed = [
      ...mockHolidayTodayRegional,
      ...mockHolidayTodayNational,
    ];
    mockFetch(mixed);
    const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
    expect(result.nationwide).toBe(true);
    expect(result.holiday).toBe('Independence Day');
  });

  it('falls back to first holiday when none are nationwide', async () => {
    mockFetch(mockHolidayTodayRegional);
    const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
    expect(result.is_holiday).toBe(true);
    expect(result.holiday).toBe('Good Friday');
    expect(result.nationwide).toBe(false);
  });

  it('date field is always present and in YYYY-MM-DD format', async () => {
    mockFetch(mockHolidayTodayEmpty);
    const result = JSON.parse(await handleHolidays('is_holiday_today', {}));
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('throws HTTP error on non-200 response', async () => {
    mockFetch(null, 503);
    await expect(handleHolidays('is_holiday_today', {}))
      .rejects.toThrow('HTTP 503');
  });
});

// ── unknown tool ─────────────────────────────────────────────────────────────

describe('unknown holidays tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleHolidays('does_not_exist', {}))
      .rejects.toThrow('Unknown holidays tool: does_not_exist');
  });
});

// ── extractName fallback: no EN language entry ────────────────────────────────

describe('get_public_holidays — extractName fallback', () => {
  it('falls back to first name entry when no EN language is present', async () => {
    const nonEnHolidays = [
      {
        id: "test-id-1",
        startDate: "2026-08-01",
        endDate: "2026-08-01",
        type: "Public",
        name: [
          { language: "DE", text: "Bundesfeier" },
          { language: "FR", text: "Fête nationale" },
        ],
        regionalScope: "National",
        temporalScope: "FullDay",
        nationwide: true,
      },
    ];
    mockFetch(nonEnHolidays);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
    expect(result.holidays).toHaveLength(1);
    // Should fall back to first entry (DE) since no EN exists
    expect(result.holidays[0].name).toBe('Bundesfeier');
  });

  it('falls back to "Unknown" when name array is empty', async () => {
    const emptyNameHolidays = [
      {
        id: "test-id-2",
        startDate: "2026-08-01",
        endDate: "2026-08-01",
        type: "Public",
        name: [],
        regionalScope: "National",
        temporalScope: "FullDay",
        nationwide: true,
      },
    ];
    mockFetch(emptyNameHolidays);
    const result = JSON.parse(await handleHolidays('get_public_holidays', { year: 2026 }));
    expect(result.holidays).toHaveLength(1);
    expect(result.holidays[0].name).toBe('Unknown');
  });
});
