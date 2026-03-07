import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleCompanies } from '../../src/modules/companies.js';
import {
  mockSearchResponse,
  mockCompanyDetail,
  mockSearchByAddressResponse,
} from '../fixtures/companies.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    json: () => Promise.resolve(payload),
  }));
}

// ── search_companies ──────────────────────────────────────────────────────────

describe('search_companies', () => {
  it('returns companies array from API response', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'Migros' }));
    expect(result).toHaveProperty('companies');
    expect(Array.isArray(result.companies)).toBe(true);
    expect(result.companies).toHaveLength(1);
  });

  it('company entry has expected fields', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'Migros' }));
    const company = result.companies[0];
    expect(company.name).toBe('Migros-Genossenschafts-Bund');
    expect(company.uidFormatted).toBe('CHE-105.829.940');
    expect(company.legalSeat).toBe('Zürich');
  });

  it('includes hasMoreResults field', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'Migros' }));
    expect(result).toHaveProperty('hasMoreResults', false);
  });

  it('sends canton param in POST body when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockSearchResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleCompanies('search_companies', { name: 'Test', canton: 'ZH' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.cantonAbbreviation).toContain('ZH');
  });

  it('returns empty result on 404', async () => {
    mockFetch({}, 404);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'NonexistentXYZ123' }));
    expect(result.companies).toHaveLength(0);
    expect(result.hasMoreResults).toBe(false);
  });

  it('returns empty result when data.error is set', async () => {
    mockFetch({ error: 'No results', list: undefined, hasMoreResults: false });
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'XYZ' }));
    expect(result.companies).toHaveLength(0);
  });

  it('uses POST method', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockSearchResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleCompanies('search_companies', { name: 'Test' });
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('passes legal_form in POST body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockSearchResponse),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleCompanies('search_companies', { name: 'Test', legal_form: '0106' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.legalFormCode).toBe('0106');
  });
});

// ── get_company ───────────────────────────────────────────────────────────────

describe('get_company', () => {
  it('returns company details', async () => {
    mockFetch(mockCompanyDetail);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.name).toBe('Migros-Genossenschafts-Bund');
    expect(result.uidFormatted).toBe('CHE-105.829.940');
  });

  it('has address details', async () => {
    mockFetch(mockCompanyDetail);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.address.city).toBe('Zürich');
    expect(result.address.street).toBe('Limmatstrasse');
  });

  it('has status and purpose', async () => {
    mockFetch(mockCompanyDetail);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.status).toBe('EXISTIEREND');
    expect(result.purpose).toBeTruthy();
  });

  it('calls correct endpoint with ehraid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: () => Promise.resolve(mockCompanyDetail),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleCompanies('get_company', { ehraid: 119283 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('119283');
    expect(calledUrl).toContain('.json');
  });
});

// ── search_companies_by_address ───────────────────────────────────────────────

describe('search_companies_by_address', () => {
  it('returns companies array', async () => {
    mockFetch(mockSearchByAddressResponse);
    const result = JSON.parse(await handleCompanies('search_companies_by_address', {
      address: 'Bahnhofstrasse Zürich',
    }));
    expect(result).toHaveProperty('companies');
    expect(Array.isArray(result.companies)).toBe(true);
    expect(result.companies).toHaveLength(1);
  });

  it('company entry has name and uid', async () => {
    mockFetch(mockSearchByAddressResponse);
    const result = JSON.parse(await handleCompanies('search_companies_by_address', {
      address: 'Bern',
    }));
    expect(result.companies[0].name).toBe('Test AG');
    expect(result.companies[0].legalSeat).toBe('Bern');
  });

  it('returns empty on 404', async () => {
    mockFetch({}, 404);
    const result = JSON.parse(await handleCompanies('search_companies_by_address', {
      address: 'Nonexistent Address XYZ',
    }));
    expect(result.companies).toHaveLength(0);
  });
});

// ── list_cantons ──────────────────────────────────────────────────────────────

describe('list_cantons', () => {
  it('returns exactly 26 cantons', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(26);
  });

  it('each canton has code and name fields', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    for (const canton of result) {
      expect(canton).toHaveProperty('code');
      expect(canton).toHaveProperty('name');
      expect(typeof canton.code).toBe('string');
      expect(typeof canton.name).toBe('string');
    }
  });

  it('contains Zürich with code ZH', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    const zh = result.find((c: { code: string }) => c.code === 'ZH');
    expect(zh).toBeDefined();
    expect(zh.name).toBe('Zürich');
  });

  it('contains Bern with code BE', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    const be = result.find((c: { code: string }) => c.code === 'BE');
    expect(be?.name).toBe('Bern');
  });

  it('does not make any HTTP request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await handleCompanies('list_cantons', {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── list_legal_forms ──────────────────────────────────────────────────────────

describe('list_legal_forms', () => {
  it('returns array of legal forms', async () => {
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('each form has code, name, and nameEn', async () => {
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    for (const form of result) {
      expect(form).toHaveProperty('code');
      expect(form).toHaveProperty('name');
      expect(form).toHaveProperty('nameEn');
    }
  });

  it('contains AG (Aktiengesellschaft)', async () => {
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    const ag = result.find((f: { nameEn: string }) => f.nameEn.includes('Corporation'));
    expect(ag).toBeDefined();
    expect(ag.name).toContain('AG');
  });

  it('contains GmbH (limited liability)', async () => {
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    const gmbh = result.find((f: { nameEn: string }) => f.nameEn.includes('GmbH'));
    expect(gmbh).toBeDefined();
    expect(gmbh.name).toContain('GmbH');
  });

  it('does not make any HTTP request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await handleCompanies('list_legal_forms', {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── error branches ────────────────────────────────────────────────────────────

describe('search_companies error handling', () => {
  it('throws on non-404 HTTP error', async () => {
    mockFetch({}, 500);
    await expect(handleCompanies('search_companies', { name: 'test' }))
      .rejects.toThrow('HTTP 500');
  });

  it('returns empty on API error response', async () => {
    mockFetch({ error: 'something went wrong', list: null, hasMoreResults: false });
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'test' }));
    expect(result.companies).toEqual([]);
  });

  it('handles missing list/hasMoreResults with defaults', async () => {
    mockFetch({});
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'test' }));
    expect(result.companies).toEqual([]);
    expect(result.hasMoreResults).toBe(false);
  });
});

describe('search_companies_by_address error handling', () => {
  it('throws on non-404 HTTP error', async () => {
    mockFetch({}, 500);
    await expect(handleCompanies('search_companies_by_address', { address: 'test' }))
      .rejects.toThrow('HTTP 500');
  });

  it('returns empty on API error response', async () => {
    mockFetch({ error: 'bad request', list: null, hasMoreResults: false });
    const result = JSON.parse(await handleCompanies('search_companies_by_address', { address: 'test' }));
    expect(result.companies).toEqual([]);
  });

  it('handles missing list/hasMoreResults with defaults', async () => {
    mockFetch({});
    const result = JSON.parse(await handleCompanies('search_companies_by_address', { address: 'test' }));
    expect(result.companies).toEqual([]);
    expect(result.hasMoreResults).toBe(false);
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown companies tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleCompanies('does_not_exist', {}))
      .rejects.toThrow('Unknown companies tool: does_not_exist');
  });
});
