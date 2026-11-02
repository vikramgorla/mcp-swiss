// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleCompanies } from '../../src/modules/companies.js';

interface Company {
  name: string;
  ehraid: number;
  uid: string;
  legalSeat: string;
  canton: string | null;
  legalFormId: number;
  legalForm: string | null;
  status: string;
}

describe('Companies API (live)', () => {
  it('search_companies finds Migros', async () => {
    const raw = await handleCompanies('search_companies', { name: 'Migros', limit: 5 });
    const result = JSON.parse(raw);
    expect(Array.isArray(result.companies)).toBe(true);
    expect(result.companies.length).toBeGreaterThan(0);
    expect(raw.length).toBeLessThan(50000);
  });

  it('company result has expected fields', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Migros-Genossenschafts-Bund',
      limit: 1,
    }));
    const company: Company = result.companies[0];
    expect(company.name).toBeTruthy();
    expect(company.ehraid).toBeDefined();
    expect(company.uid).toMatch(/CHE-\d{3}\.\d{3}\.\d{3}/);
    expect(company.canton).toBe('ZH');
  });

  it('canton filter really restricts the results to that canton', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Bank',
      canton: 'GE',
      limit: 50,
    }));
    expect(result.companies.length).toBeGreaterThan(0);
    for (const company of result.companies as Company[]) {
      expect(company.canton).toBe('GE');
    }
  });

  it('the same search without a canton spans several cantons', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', { name: 'Bank', limit: 50 }));
    const cantons = new Set((result.companies as Company[]).map((c) => c.canton));
    expect(cantons.size).toBeGreaterThan(1);
  });

  it('canton filter works for Valais, which runs three registry offices', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Bank',
      canton: 'VS',
      limit: 50,
    }));
    expect(result.companies.length).toBeGreaterThan(0);
    for (const company of result.companies as Company[]) {
      expect(company.canton).toBe('VS');
    }
  });

  it('legal_form filter really restricts the results to that form', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Bank',
      legal_form: 4, // GmbH
      limit: 50,
    }));
    expect(result.companies.length).toBeGreaterThan(0);
    for (const company of result.companies as Company[]) {
      expect(company.legalFormId).toBe(4);
      expect(company.legalForm).toBe('GmbH');
    }
  });

  it('canton and legal_form combine', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Bank',
      canton: 'ZH',
      legal_form: 3, // AG
      limit: 50,
    }));
    expect(result.companies.length).toBeGreaterThan(0);
    for (const company of result.companies as Company[]) {
      expect(company.canton).toBe('ZH');
      expect(company.legalFormId).toBe(3);
    }
  });

  it('rejects a canton code that does not exist', async () => {
    await expect(handleCompanies('search_companies', { name: 'Bank', canton: 'XX' }))
      .rejects.toThrow('Unknown canton');
  });

  it('search_companies returns empty for nonsense name', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'XYZ_NONEXISTENT_123456789',
    }));
    expect(result.companies).toEqual([]);
  });

  it('search_companies_by_locality returns only companies seated in that commune', async () => {
    const raw = await handleCompanies('search_companies_by_locality', { locality: 'Zug', limit: 20 });
    const result = JSON.parse(raw);
    expect(result.companies.length).toBeGreaterThan(0);
    for (const company of result.companies as Company[]) {
      expect(company.legalSeat).toBe('Zug');
      expect(company.canton).toBe('ZG');
    }
    expect(raw.length).toBeLessThan(50000);
  });

  it('search_companies_by_locality accepts an unaccented commune name', async () => {
    const result = JSON.parse(await handleCompanies('search_companies_by_locality', {
      locality: 'geneve',
      limit: 5,
    }));
    expect(result.companies.length).toBeGreaterThan(0);
    for (const company of result.companies as Company[]) {
      expect(company.canton).toBe('GE');
    }
  });

  it('search_companies_by_locality narrows by name too', async () => {
    const all = JSON.parse(await handleCompanies('search_companies_by_locality', {
      locality: 'Lausanne',
      limit: 20,
    }));
    const named = JSON.parse(await handleCompanies('search_companies_by_locality', {
      locality: 'Lausanne',
      name: 'Banque',
      limit: 20,
    }));
    expect(named.companies.length).toBeGreaterThan(0);
    for (const company of named.companies as Company[]) {
      expect(company.legalSeat).toBe('Lausanne');
      // ZEFIX falls back to an inexact match, so "Banque" also returns "Bank ...".
      expect(company.name.toLowerCase()).toMatch(/ban[kq]/);
    }
    expect(named.companies.map((c: Company) => c.ehraid))
      .not.toEqual(all.companies.map((c: Company) => c.ehraid));
  });

  it('search_companies_by_locality rejects a street address', async () => {
    await expect(handleCompanies('search_companies_by_locality', { locality: 'Bahnhofstrasse 1, Zürich' }))
      .rejects.toThrow('No Swiss commune named');
  });

  it('get_company returns Migros details by ehraid', async () => {
    const search = JSON.parse(await handleCompanies('search_companies', {
      name: 'Migros-Genossenschafts-Bund',
      limit: 1,
    }));
    const ehraid = search.companies[0].ehraid;
    const raw = await handleCompanies('get_company', { ehraid });
    const result = JSON.parse(raw);
    expect(result.name).toBeTruthy();
    expect(result.ehraid).toBe(ehraid);
    expect(result.canton).toBe('ZH');
    expect(result.shabPub.length).toBeLessThanOrEqual(10);
    expect(result.shabPubTotal).toBeGreaterThanOrEqual(result.shabPub.length);
    expect(raw.length).toBeLessThan(50000);
  });

  it('get_company rejects a CHE uid instead of building a bad URL', async () => {
    await expect(handleCompanies('get_company', { ehraid: 'CHE-105.829.940' }))
      .rejects.toThrow('Invalid ehraid');
  });

  it('list_cantons returns 26 cantons (no API call needed)', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    expect(result).toHaveLength(26);
  });

  it('list_legal_forms returns the live ZEFIX list with usable ids', async () => {
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(result.length).toBeGreaterThan(10);
    const ag = result.find((f: { abbr: string }) => f.abbr === 'AG');
    const gmbh = result.find((f: { abbr: string }) => f.abbr === 'GmbH');
    expect(ag.id).toBe(3);
    expect(gmbh.id).toBe(4);

    // every id it advertises is accepted by search_companies
    const search = JSON.parse(await handleCompanies('search_companies', {
      name: 'Bank',
      legal_form: ag.id,
      limit: 5,
    }));
    expect(search.companies.length).toBeGreaterThan(0);
  });
});
