import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  handleRecycling,
  recyclingTools,
  WASTE_TYPE_DESCRIPTIONS,
  SUPPORTED_WASTE_TYPES,
} from '../../src/modules/recycling.js';
import {
  mockUpcomingCardboard,
  mockUpcomingAll,
  mockUpcomingWithDescription,
  mockEmptyResult,
  mockMarchCalendar,
  mockMultiTypeDay,
  mockFebruaryCalendar,
} from '../fixtures/recycling.js';

// ── Test helpers ─────────────────────────────────────────────────────────────

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

// ── Module shape ─────────────────────────────────────────────────────────────

describe('recyclingTools — module shape', () => {
  it('exports exactly 3 tools', () => {
    expect(recyclingTools).toHaveLength(3);
  });

  it('tool names are correct', () => {
    const names = recyclingTools.map((t) => t.name);
    expect(names).toContain('get_waste_collection');
    expect(names).toContain('list_waste_types');
    expect(names).toContain('get_waste_calendar');
  });

  it('all tools have name, description, inputSchema', () => {
    for (const tool of recyclingTools) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('get_waste_collection requires zip', () => {
    const tool = recyclingTools.find((t) => t.name === 'get_waste_collection')!;
    expect(tool.inputSchema.required).toContain('zip');
  });

  it('get_waste_calendar requires zip', () => {
    const tool = recyclingTools.find((t) => t.name === 'get_waste_calendar')!;
    expect(tool.inputSchema.required).toContain('zip');
  });

  it('all tool descriptions mention Zurich city coverage', () => {
    for (const tool of recyclingTools) {
      expect(tool.description.toLowerCase()).toContain('zurich');
    }
  });
});

// ── WASTE_TYPE_DESCRIPTIONS / SUPPORTED_WASTE_TYPES exports ─────────────────

describe('WASTE_TYPE_DESCRIPTIONS', () => {
  it('contains at least 6 types', () => {
    expect(Object.keys(WASTE_TYPE_DESCRIPTIONS).length).toBeGreaterThanOrEqual(6);
  });

  it('includes the main types', () => {
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('waste');
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('cardboard');
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('paper');
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('organic');
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('textile');
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('special');
    expect(WASTE_TYPE_DESCRIPTIONS).toHaveProperty('mobile');
  });

  it('SUPPORTED_WASTE_TYPES matches keys', () => {
    expect(SUPPORTED_WASTE_TYPES).toEqual(expect.arrayContaining(Object.keys(WASTE_TYPE_DESCRIPTIONS)));
    expect(SUPPORTED_WASTE_TYPES.length).toBe(Object.keys(WASTE_TYPE_DESCRIPTIONS).length);
  });
});

// ── get_waste_collection ─────────────────────────────────────────────────────

describe('get_waste_collection', () => {
  it('returns upcoming collections with zip, type, count, and array', async () => {
    mockFetch(mockUpcomingCardboard);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', type: 'cardboard' }));
    expect(result.zip).toBe('8001');
    expect(result.type).toBe('cardboard');
    expect(result.count).toBe(5);
    expect(Array.isArray(result.upcoming)).toBe(true);
    expect(result.source).toContain('openerz');
  });

  it('each entry has date, waste_type, zip', async () => {
    mockFetch(mockUpcomingCardboard);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', type: 'cardboard' }));
    const entry = result.upcoming[0];
    expect(entry.date).toBe('2026-03-12');
    expect(entry.waste_type).toBe('cardboard');
    expect(entry.zip).toBe(8001);
  });

  it('defaults type to "all" when no type specified', async () => {
    mockFetch(mockUpcomingAll);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
    expect(result.type).toBe('all');
  });

  it('respects limit parameter', async () => {
    mockFetch(mockUpcomingAll);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', limit: 3 }));
    expect(result.upcoming.length).toBeLessThanOrEqual(3);
  });

  it('defaults limit to 5', async () => {
    // Mock returns 10 items, but default limit should cap at 5
    mockFetch(mockUpcomingAll);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
    expect(result.upcoming.length).toBeLessThanOrEqual(5);
  });

  it('passes type param to API URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockUpcomingCardboard),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_collection', { zip: '8001', type: 'cardboard' });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('types=cardboard');
    expect(url).toContain('zip=8001');
  });

  it('passes start=today to API URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockUpcomingCardboard),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_collection', { zip: '8001' });
    const url = fetchMock.mock.calls[0][0] as string;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    expect(url).toContain(`start=${y}-${m}-${d}`);
  });

  it('does not pass types param when no type specified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockUpcomingAll),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_collection', { zip: '8001' });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain('types=');
  });

  it('returns empty array when no upcoming collections', async () => {
    mockFetch(mockEmptyResult);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8099' }));
    expect(result.count).toBe(0);
    expect(result.upcoming).toEqual([]);
  });

  it('includes description field when entry has a non-empty description', async () => {
    mockFetch(mockUpcomingWithDescription);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', type: 'special' }));
    expect(result.upcoming[0].description).toBe('Hazardous materials — bring to mobile station');
  });

  it('omits description field when description is empty', async () => {
    mockFetch(mockUpcomingCardboard);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001', type: 'cardboard' }));
    expect(result.upcoming[0].description).toBeUndefined();
  });

  it('throws when zip is missing', async () => {
    await expect(handleRecycling('get_waste_collection', {}))
      .rejects.toThrow('zip is required');
  });

  it('throws when zip is empty string', async () => {
    await expect(handleRecycling('get_waste_collection', { zip: '' }))
      .rejects.toThrow('zip is required');
  });

  it('throws HTTP error on non-200 response', async () => {
    mockFetch(null, 500);
    await expect(handleRecycling('get_waste_collection', { zip: '8001' }))
      .rejects.toThrow('HTTP 500');
  });

  it('throws HTTP error on 404', async () => {
    mockFetch(null, 404);
    await expect(handleRecycling('get_waste_collection', { zip: '9999' }))
      .rejects.toThrow('HTTP 404');
  });

  it('result includes note about Zurich coverage', async () => {
    mockFetch(mockUpcomingCardboard);
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
    expect(result.note).toContain('8001');
    expect(result.note).toContain('8099');
  });

  it('clamps limit to minimum of 1', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockUpcomingCardboard),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_collection', { zip: '8001', limit: -5 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=1');
  });

  it('clamps limit to maximum of 100', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockUpcomingAll),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_collection', { zip: '8001', limit: 999 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('limit=100');
  });
});

// ── list_waste_types ─────────────────────────────────────────────────────────

describe('list_waste_types', () => {
  it('returns types array and count without calling API', async () => {
    const result = JSON.parse(await handleRecycling('list_waste_types', {}));
    expect(Array.isArray(result.types)).toBe(true);
    expect(result.count).toBe(result.types.length);
  });

  it('each type entry has type and description', async () => {
    const result = JSON.parse(await handleRecycling('list_waste_types', {}));
    for (const t of result.types) {
      expect(typeof t.type).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('includes all known types', async () => {
    const result = JSON.parse(await handleRecycling('list_waste_types', {}));
    const types = result.types.map((t: { type: string }) => t.type);
    expect(types).toContain('waste');
    expect(types).toContain('cardboard');
    expect(types).toContain('paper');
    expect(types).toContain('organic');
    expect(types).toContain('textile');
    expect(types).toContain('special');
    expect(types).toContain('mobile');
  });

  it('includes note about Zurich coverage', async () => {
    const result = JSON.parse(await handleRecycling('list_waste_types', {}));
    expect(result.note).toContain('8001');
    expect(result.note).toContain('8099');
  });

  it('includes source field', async () => {
    const result = JSON.parse(await handleRecycling('list_waste_types', {}));
    expect(result.source).toContain('openerz');
  });

  it('does not call fetch (static data)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('list_waste_types', {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── get_waste_calendar ───────────────────────────────────────────────────────

describe('get_waste_calendar', () => {
  it('returns zip, month, year, calendar array', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    expect(result.zip).toBe('8001');
    expect(result.month).toBe(3);
    expect(result.year).toBe(2026);
    expect(Array.isArray(result.calendar)).toBe(true);
  });

  it('includes month_name field', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    expect(result.month_name).toBe('March');
  });

  it('calendar entries have date and types array', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    for (const day of result.calendar) {
      expect(typeof day.date).toBe('string');
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(day.types)).toBe(true);
      expect(day.types.length).toBeGreaterThan(0);
    }
  });

  it('groups multiple types on same day', async () => {
    mockFetch(mockMultiTypeDay);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 4, year: 2026 }));
    const day = result.calendar.find((d: { date: string }) => d.date === '2026-04-01');
    expect(day).toBeDefined();
    expect(day.types).toContain('organic');
    expect(day.types).toContain('waste');
  });

  it('calendar is sorted by date', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    const dates = result.calendar.map((d: { date: string }) => d.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('returns total_events and collection_days counts', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    expect(typeof result.total_events).toBe('number');
    expect(typeof result.collection_days).toBe('number');
    expect(result.total_events).toBeGreaterThanOrEqual(result.collection_days);
  });

  it('passes start and end date to API URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockMarchCalendar),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('start=2026-03-01');
    expect(url).toContain('end=2026-03-31');
    expect(url).toContain('zip=8001');
  });

  it('February end date is 28 (non-leap year)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockFebruaryCalendar),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_calendar', { zip: '8001', month: 2, year: 2026 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('end=2026-02-28');
  });

  it('defaults to current month/year when not specified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockMarchCalendar),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_calendar', { zip: '8001' });
    const url = fetchMock.mock.calls[0][0] as string;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    expect(url).toContain(`start=${y}-${m}-01`);
  });

  it('returns empty calendar for month with no events', async () => {
    mockFetch(mockEmptyResult);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 1, year: 2030 }));
    expect(result.calendar).toEqual([]);
    expect(result.total_events).toBe(0);
    expect(result.collection_days).toBe(0);
  });

  it('throws when zip is missing', async () => {
    await expect(handleRecycling('get_waste_calendar', {}))
      .rejects.toThrow('zip is required');
  });

  it('throws when zip is empty string', async () => {
    await expect(handleRecycling('get_waste_calendar', { zip: '' }))
      .rejects.toThrow('zip is required');
  });

  it('throws HTTP error on non-200 response', async () => {
    mockFetch(null, 500);
    await expect(handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }))
      .rejects.toThrow('HTTP 500');
  });

  it('includes note about Zurich coverage', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    expect(result.note).toContain('8001');
    expect(result.note).toContain('8099');
  });

  it('includes source field', async () => {
    mockFetch(mockMarchCalendar);
    const result = JSON.parse(await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 }));
    expect(result.source).toContain('openerz');
  });

  it('clamps month to valid range (1–12)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockMarchCalendar),
    });
    vi.stubGlobal('fetch', fetchMock);
    // month=0 should clamp to 1
    await handleRecycling('get_waste_calendar', { zip: '8001', month: 0, year: 2026 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('start=2026-01-01');
  });

  it('clamps month max to 12', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockMarchCalendar),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleRecycling('get_waste_calendar', { zip: '8001', month: 15, year: 2026 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('start=2026-12-01');
  });
});

// ── unknown tool ─────────────────────────────────────────────────────────────

describe('unknown recycling tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleRecycling('does_not_exist', {}))
      .rejects.toThrow('Unknown recycling tool: does_not_exist');
  });
});

// ── null-safe result fallback ────────────────────────────────────────────────

describe('null-safe result fallback', () => {
  it('handles API response with missing result field gracefully', async () => {
    // Simulates an API response where result is absent/null
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve({ _metadata: { total_count: 0, row_count: 0 } }),
    }));
    const result = JSON.parse(await handleRecycling('get_waste_collection', { zip: '8001' }));
    expect(result.upcoming).toEqual([]);
    expect(result.count).toBe(0);
  });
});

// ── response size ─────────────────────────────────────────────────────────────

describe('response sizes', () => {
  it('get_waste_collection response is under 50K chars', async () => {
    mockFetch(mockUpcomingAll);
    const raw = await handleRecycling('get_waste_collection', { zip: '8001' });
    expect(raw.length).toBeLessThan(50000);
  });

  it('list_waste_types response is under 50K chars', async () => {
    const raw = await handleRecycling('list_waste_types', {});
    expect(raw.length).toBeLessThan(50000);
  });

  it('get_waste_calendar response is under 50K chars', async () => {
    mockFetch(mockMarchCalendar);
    const raw = await handleRecycling('get_waste_calendar', { zip: '8001', month: 3, year: 2026 });
    expect(raw.length).toBeLessThan(50000);
  });
});
