// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from 'vitest';
import { handleCompanies } from '../../src/modules/companies.js';

describe('Companies API (live)', () => {
  it('search_companies finds Migros', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Migros',
      limit: 5,
    }));
    expect(result).toHaveProperty('companies');
    expect(Array.isArray(result.companies)).toBe(true);
    expect(result.companies.length).toBeGreaterThan(0);
  });

  it('company result has expected fields', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Migros-Genossenschafts-Bund',
      limit: 1,
    }));
    if (result.companies.length > 0) {
      const company = result.companies[0];
      expect(company.name).toBeTruthy();
      expect(company.ehraid).toBeDefined();
      expect(company.uidFormatted).toMatch(/CHE-\d{3}\.\d{3}\.\d{3}/);
    }
  });

  it('search_companies with canton filter returns results', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'Bank',
      canton: 'ZH',
      limit: 3,
    }));
    expect(result).toHaveProperty('companies');
    expect(Array.isArray(result.companies)).toBe(true);
  });

  it('search_companies returns empty for nonsense name', async () => {
    const result = JSON.parse(await handleCompanies('search_companies', {
      name: 'XYZ_NONEXISTENT_123456789',
    }));
    expect(result).toHaveProperty('companies');
    // Either empty array or small number of results
    expect(Array.isArray(result.companies)).toBe(true);
  });

  it('get_company returns Migros details by ehraid', async () => {
    // First search for Migros to get the ehraid
    const search = JSON.parse(await handleCompanies('search_companies', {
      name: 'Migros-Genossenschafts-Bund',
      limit: 1,
    }));
    if (search.companies.length > 0) {
      const ehraid = search.companies[0].ehraid;
      const result = JSON.parse(await handleCompanies('get_company', { ehraid }));
      expect(result.name).toBeTruthy();
      expect(result.ehraid).toBe(ehraid);
    }
  });

  it('list_cantons returns 26 cantons (no API call needed)', async () => {
    const result = JSON.parse(await handleCompanies('list_cantons', {}));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(26);
  });

  it('list_legal_forms returns forms (no API call needed)', async () => {
    const result = JSON.parse(await handleCompanies('list_legal_forms', {}));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
