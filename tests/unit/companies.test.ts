import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleCompanies, clearCompaniesCache } from '../../src/modules/companies.js';
import {
  mockSearchResponse,
  mockSearchByLocalityResponse,
  mockNoResultResponse,
  mockCompanyDetail,
  mockLegalForms,
  mockRegisterOffices,
  mockCommunities,
} from '../fixtures/companies.js';

afterEach(() => {
  vi.unstubAllGlobals();
  clearCompaniesCache();
});

function ok(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(payload),
  };
}

/**
 * Routes by URL, so the reference lists (legalForm/registerOffice/community)
 * and the search POST can return different payloads in the same test.
 */
function mockFetch(search: unknown, opts: { status?: number; detail?: unknown } = {}) {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('/legalForm.json')) return Promise.resolve(ok(mockLegalForms));
    if (url.includes('/registerOffice.json')) return Promise.resolve(ok(mockRegisterOffices));
    if (url.includes('/community.json')) return Promise.resolve(ok(mockCommunities));
    if (url.includes('/firm/search.json')) {
      const status = opts.status ?? 200;
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
        json: () => Promise.resolve(search),
      });
    }
    return Promise.resolve(ok(opts.detail ?? mockCompanyDetail));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function searchBody(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/firm/search.json'));
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

// ── search_companies ──────────────────────────────────────────────────────────

describe('search_companies', () => {
  it('returns companies array from API response', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'Migros' }));
    expect(Array.isArray(result.companies)).toBe(true);
    expect(result.companies).toHaveLength(1);
    expect(result).toHaveProperty('hasMoreResults', false);
  });

  it('company entry is slimmed and annotated with canton and legal form', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'Migros' }));
    const company = result.companies[0];
    expect(company.name).toBe('Migros-Genossenschafts-Bund');
    expect(company.uid).toBe('CHE-105.829.940');
    expect(company.legalSeat).toBe('Zürich');
    expect(company.canton).toBe('ZH');
    expect(company.legalForm).toBe('Gen');
    expect(company).not.toHaveProperty('chid');
  });

  it('uses POST', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test' });
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/firm/search.json'));
    expect((call?.[1] as RequestInit).method).toBe('POST');
  });

  it('sends no filter keys when canton/legal_form are omitted', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test' });
    const body = searchBody(fetchMock);
    expect(body).not.toHaveProperty('registryOffices');
    expect(body).not.toHaveProperty('legalForms');
  });

  // Regression: canton used to be sent as `cantonAbbreviation`, which ZEFIX ignores.
  it('translates canton into the registry-office ids ZEFIX filters on', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test', canton: 'ZH' });
    const body = searchBody(fetchMock);
    expect(body.registryOffices).toEqual([20]);
    expect(body).not.toHaveProperty('cantonAbbreviation');
  });

  it('sends every registry office of a canton that has more than one', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test', canton: 'VS' });
    expect(searchBody(fetchMock).registryOffices.sort()).toEqual([600, 621, 626]);
  });

  it('accepts a lower-case canton code', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test', canton: 'zh' });
    expect(searchBody(fetchMock).registryOffices).toEqual([20]);
  });

  it('rejects an unknown canton instead of ignoring it', async () => {
    mockFetch(mockSearchResponse);
    await expect(handleCompanies('search_companies', { name: 'Test', canton: 'XX' }))
      .rejects.toThrow('Unknown canton');
  });

  // Regression: legal_form used to be sent as `legalFormCode: "0106"`, which ZEFIX ignores.
  it('sends legal_form as the numeric legalForms filter', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test', legal_form: 4 });
    const body = searchBody(fetchMock);
    expect(body.legalForms).toEqual([4]);
    expect(body).not.toHaveProperty('legalFormCode');
  });

  it('rejects a legal form id that is not in the ZEFIX list', async () => {
    mockFetch(mockSearchResponse);
    await expect(handleCompanies('search_companies', { name: 'Test', legal_form: '0106' }))
      .rejects.toThrow('Unknown legal_form');
  });

  it('combines canton and legal_form', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Bank', canton: 'ZG', legal_form: 3, limit: 5 });
    const body = searchBody(fetchMock);
    expect(body.registryOffices).toEqual([170]);
    expect(body.legalForms).toEqual([3]);
    expect(body.maxEntries).toBe(5);
  });

  it('caps maxEntries so a huge limit cannot blow the response budget', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test', limit: 5000 });
    expect(searchBody(fetchMock).maxEntries).toBe(100);
  });

  it('falls back to 20 for a missing or nonsense limit', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('search_companies', { name: 'Test' });
    expect(searchBody(fetchMock).maxEntries).toBe(20);
    await handleCompanies('search_companies', { name: 'Test', limit: 'many' });
    expect(searchBody(fetchMock).maxEntries).toBe(20);
  });

  it('returns empty result on 404', async () => {
    mockFetch({}, { status: 404 });
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'NonexistentXYZ123' }));
    expect(result.companies).toHaveLength(0);
    expect(result.hasMoreResults).toBe(false);
  });

  it('returns empty result on the 200 + error envelope ZEFIX uses for no results', async () => {
    mockFetch(mockNoResultResponse);
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'XYZ' }));
    expect(result.companies).toHaveLength(0);
  });

  it('throws on non-404 HTTP error', async () => {
    mockFetch({}, { status: 500 });
    await expect(handleCompanies('search_companies', { name: 'test' })).rejects.toThrow('HTTP 500');
  });

  it('handles a missing list with defaults', async () => {
    mockFetch({});
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'test' }));
    expect(result.companies).toEqual([]);
    expect(result.hasMoreResults).toBe(false);
  });
});

// ── get_company ───────────────────────────────────────────────────────────────

describe('get_company', () => {
  it('returns company details', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.name).toBe('Migros-Genossenschafts-Bund');
    expect(result.uidFormatted).toBe('CHE-105.829.940');
    expect(result.status).toBe('EXISTIEREND');
    expect(result.purpose).toBeTruthy();
  });

  it('has address details', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.address.town).toBe('Zürich');
    expect(result.address.street).toBe('Limmatstrasse');
  });

  it('adds canton and legal form names', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.canton).toBe('ZH');
    expect(result.legalForm).toBe('Cooperative');
  });

  it('caps the journal entries and reports the real total', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('get_company', { ehraid: 119283 }));
    expect(result.shabPub).toHaveLength(10);
    expect(result.shabPubTotal).toBe(25);
  });

  it('calls the ehraid endpoint', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('get_company', { ehraid: 119283 });
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/firm/119283.json'));
    expect(call).toBeDefined();
  });

  // Regression: the ehraid used to be interpolated into the URL unchecked.
  it.each([
    ['CHE-105.829.940'],
    ['../check'],
    ['119283/../../'],
    ['12 OR 1=1'],
    [''],
    [-5],
    [1.5],
  ])('rejects a non-numeric ehraid: %s', async (ehraid) => {
    const fetchMock = mockFetch(mockSearchResponse);
    await expect(handleCompanies('get_company', { ehraid })).rejects.toThrow('Invalid ehraid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts an ehraid passed as a digit string', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('get_company', { ehraid: '119283' });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/firm/119283.json'))).toBe(true);
  });
});

// ── search_companies_by_locality ──────────────────────────────────────────────

describe('search_companies_by_locality', () => {
  // Regression: this used to send the address string as the company `name`.
  it('resolves the locality to commune ids and filters on legalSeats', async () => {
    const fetchMock = mockFetch(mockSearchByLocalityResponse);
    await handleCompanies('search_companies_by_locality', { locality: 'Lausanne' });
    const body = searchBody(fetchMock);
    expect(body.legalSeats).toEqual([2264]);
    expect(body).not.toHaveProperty('name');
  });

  it('matches a commune ignoring case and accents', async () => {
    const fetchMock = mockFetch(mockSearchByLocalityResponse);
    await handleCompanies('search_companies_by_locality', { locality: 'geneve' });
    expect(searchBody(fetchMock).legalSeats).toEqual([1500]);
  });

  it('matches an alternate commune name', async () => {
    const fetchMock = mockFetch(mockSearchByLocalityResponse);
    await handleCompanies('search_companies_by_locality', { locality: 'Zurigo' });
    expect(searchBody(fetchMock).legalSeats).toEqual([248]);
  });

  it('passes an optional name filter through', async () => {
    const fetchMock = mockFetch(mockSearchByLocalityResponse);
    await handleCompanies('search_companies_by_locality', { locality: 'Zug', name: 'Crypto', limit: 5 });
    const body = searchBody(fetchMock);
    expect(body.legalSeats).toEqual([1362]);
    expect(body.name).toBe('Crypto');
    expect(body.maxEntries).toBe(5);
  });

  it('returns slimmed companies', async () => {
    mockFetch(mockSearchByLocalityResponse);
    const result = JSON.parse(await handleCompanies('search_companies_by_locality', { locality: 'Lausanne' }));
    expect(result.companies[0].name).toBe('Test AG');
    expect(result.companies[0].canton).toBe('VD');
  });

  it('explains that a street address cannot be searched', async () => {
    mockFetch(mockSearchByLocalityResponse);
    await expect(handleCompanies('search_companies_by_locality', { locality: 'Bahnhofstrasse 1' }))
      .rejects.toThrow('No Swiss commune named');
  });

  it('returns empty on 404', async () => {
    mockFetch({}, { status: 404 });
    const result = JSON.parse(await handleCompanies('search_companies_by_locality', { locality: 'Zug' }));
    expect(result.companies).toHaveLength(0);
  });

  it('throws on non-404 HTTP error', async () => {
    mockFetch({}, { status: 500 });
    await expect(handleCompanies('search_companies_by_locality', { locality: 'Zug' }))
      .rejects.toThrow('HTTP 500');
  });
});

// ── list_cantons ──────────────────────────────────────────────────────────────

describe('list_cantons', () => {
  it('returns exactly 26 cantons with code and name', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    expect(result).toHaveLength(26);
    for (const canton of result) {
      expect(typeof canton.code).toBe('string');
      expect(typeof canton.name).toBe('string');
    }
  });

  it('contains Zürich and Bern', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    expect(result.find((c: { code: string }) => c.code === 'ZH').name).toBe('Zürich');
    expect(result.find((c: { code: string }) => c.code === 'BE').name).toBe('Bern');
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
  // Regression: the codes used to be invented "0101"-style strings.
  it('returns the ids ZEFIX actually accepts, not 0101-style codes', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(result.length).toBeGreaterThan(0);
    for (const form of result) {
      expect(typeof form.id).toBe('number');
      expect(form).not.toHaveProperty('code');
    }
  });

  it('maps AG to id 3 and GmbH to id 4', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(result.find((f: { abbr: string }) => f.abbr === 'AG').id).toBe(3);
    expect(result.find((f: { abbr: string }) => f.abbr === 'GmbH').id).toBe(4);
  });

  it('drops the (unknown) placeholder form', async () => {
    mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(result.some((f: { id: number }) => f.id === 0)).toBe(false);
  });

  it('caches the list across calls', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await handleCompanies('list_legal_forms', {});
    await handleCompanies('list_legal_forms', {});
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/legalForm.json'));
    expect(calls).toHaveLength(1);
  });

  it('two concurrent calls fetch the list once', async () => {
    const fetchMock = mockFetch(mockSearchResponse);
    await Promise.all([
      handleCompanies('list_legal_forms', {}),
      handleCompanies('list_legal_forms', {}),
    ]);
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/legalForm.json'));
    expect(calls).toHaveLength(1);
  });

  it('retries after a failed load instead of caching the failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    await expect(handleCompanies('list_legal_forms', {})).rejects.toThrow();
    const fetchMock = mockFetch(mockSearchResponse);
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(result.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalled();
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown companies tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleCompanies('does_not_exist', {}))
      .rejects.toThrow('Unknown companies tool: does_not_exist');
  });

  it('no longer exposes search_companies_by_address', async () => {
    await expect(handleCompanies('search_companies_by_address', { address: 'Bahnhofstrasse' }))
      .rejects.toThrow('Unknown companies tool');
  });
});
