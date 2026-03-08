// Integration tests for Swiss energy (ElCom) module — hits real API
// Run with: npm run test:integration -- tests/integration/energy.integration.test.ts
import { describe, it, expect } from 'vitest';
import { handleEnergy } from '../../src/modules/energy.js';

const TIMEOUT = 15000;

// Helper: the handler returns a single object when only 1 operator, or an array when multiple.
// Normalise to always get the first (cheapest/primary) tariff entry.
function firstEntry(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[];
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

describe('ElCom Energy API (live)', () => {
  // ── search_municipality_energy ────────────────────────────────────────────

  describe('search_municipality_energy', () => {
    it('finds Zürich by name', async () => {
      const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Zürich' }));
      expect(result.results.length).toBeGreaterThan(0);
      const zurich = result.results.find((m: { id: string; name: string }) => m.id === '261');
      expect(zurich).toBeTruthy();
      expect(zurich.name).toContain('rich');
    }, TIMEOUT);

    it('finds Bern by name', async () => {
      const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Bern' }));
      expect(result.results.length).toBeGreaterThan(0);
      const bern = result.results.find((m: { id: string; name: string }) => m.id === '351');
      expect(bern).toBeTruthy();
    }, TIMEOUT);

    it('finds Geneva (Genève)', async () => {
      const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Gen' }));
      expect(result.results.length).toBeGreaterThan(0);
      const geneve = result.results.find((m: { id: string }) => m.id === '6621');
      expect(geneve).toBeTruthy();
    }, TIMEOUT);

    it('returns empty results for nonsense query', async () => {
      const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'zzzznonexistentxxx99' }));
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(0);
      expect(result.message).toBeTruthy();
    }, TIMEOUT);

    it('includes usage hint in each result', async () => {
      const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Bern' }));
      for (const r of result.results) {
        expect(r.usage).toContain(r.id);
      }
    }, TIMEOUT);

    it('response is under 50K chars', async () => {
      const raw = await handleEnergy('search_municipality_energy', { name: 'Basel' });
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);
  });

  // ── get_electricity_tariff ────────────────────────────────────────────────

  describe('get_electricity_tariff', () => {
    it('returns H4 tariff for Zürich (261)', async () => {
      const raw = await handleEnergy('get_electricity_tariff', {
        municipality: '261',
        category: 'H4',
        year: '2026',
      });
      const result = firstEntry(raw);
      expect(result.municipality).toContain('rich');
      expect(result.municipalityId).toBe('261');
      expect(typeof result.tariff).toBe('object');
      const tariff = result.tariff as Record<string, unknown>;
      expect(typeof tariff.total_rp_per_kwh).toBe('number');
      expect(tariff.total_rp_per_kwh as number).toBeGreaterThan(0);
      expect(tariff.total_rp_per_kwh as number).toBeLessThan(100); // sanity: <1 CHF/kWh
    }, TIMEOUT);

    it('returns tariff for Bern (351)', async () => {
      const raw = await handleEnergy('get_electricity_tariff', { municipality: '351' });
      const result = firstEntry(raw);
      expect(result.municipality).toContain('Bern');
      const tariff = result.tariff as Record<string, unknown>;
      expect(tariff.total_rp_per_kwh as number).toBeGreaterThan(0);
    }, TIMEOUT);

    it('returns tariff for Genève (6621)', async () => {
      const raw = await handleEnergy('get_electricity_tariff', { municipality: '6621' });
      const result = firstEntry(raw);
      expect(result.municipality as string).toMatch(/Gen/i);
      const tariff = result.tariff as Record<string, unknown>;
      expect(tariff.total_rp_per_kwh as number).toBeGreaterThan(0);
    }, TIMEOUT);

    it('includes price components breakdown', async () => {
      const raw = await handleEnergy('get_electricity_tariff', { municipality: '261' });
      const result = firstEntry(raw);
      const tariff = result.tariff as Record<string, unknown>;
      const comps = tariff.components as Record<string, unknown>;
      expect(comps).toHaveProperty('energy_rp_per_kwh');
      expect(comps).toHaveProperty('grid_usage_rp_per_kwh');
      expect(comps).toHaveProperty('federal_levy_rp_per_kwh');
    }, TIMEOUT);

    it('includes source URL', async () => {
      const raw = await handleEnergy('get_electricity_tariff', { municipality: '261' });
      const result = firstEntry(raw);
      expect(result.source as string).toContain('elcom.admin.ch');
      expect(result.source as string).toContain('261');
    }, TIMEOUT);

    it('includes unit note in Rappen', async () => {
      const raw = await handleEnergy('get_electricity_tariff', { municipality: '261' });
      const result = firstEntry(raw);
      expect(result.note as string).toContain('Rappen');
    }, TIMEOUT);

    it('works for H1 category (small apartment)', async () => {
      const raw = await handleEnergy('get_electricity_tariff', {
        municipality: '261',
        category: 'H1',
      });
      const result = firstEntry(raw);
      expect(result.category).toBe('H1');
      expect(result.categoryDescription as string).toContain('kWh');
      const tariff = result.tariff as Record<string, unknown>;
      expect(tariff.total_rp_per_kwh as number).toBeGreaterThan(0);
    }, TIMEOUT);

    it('works for commercial C2 category', async () => {
      const raw = await handleEnergy('get_electricity_tariff', {
        municipality: '261',
        category: 'C2',
      });
      const result = firstEntry(raw);
      expect(result.category).toBe('C2');
      const tariff = result.tariff as Record<string, unknown>;
      expect(tariff.total_rp_per_kwh as number).toBeGreaterThan(0);
    }, TIMEOUT);

    it('works for historical year 2023', async () => {
      const raw = await handleEnergy('get_electricity_tariff', {
        municipality: '261',
        year: '2023',
      });
      const result = firstEntry(raw);
      expect(result.year).toBe('2023');
      const tariff = result.tariff as Record<string, unknown>;
      expect(tariff.total_rp_per_kwh as number).toBeGreaterThan(0);
    }, TIMEOUT);

    it('returns no-data response for invalid municipality ID', async () => {
      const result = JSON.parse(await handleEnergy('get_electricity_tariff', {
        municipality: '999999',
      }));
      expect(result.error).toBeTruthy();
      expect(result.hint).toBeTruthy();
    }, TIMEOUT);

    it('response is under 50K chars', async () => {
      const raw = await handleEnergy('get_electricity_tariff', { municipality: '261' });
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);
  });

  // ── compare_electricity_tariffs ───────────────────────────────────────────

  describe('compare_electricity_tariffs', () => {
    it('compares Zürich, Bern, and Genève', async () => {
      const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351', '6621'],
        category: 'H4',
        year: '2026',
      }));
      expect(Array.isArray(result.comparison)).toBe(true);
      expect(result.comparison.length).toBe(3);
      // Results should be sorted cheapest first
      const prices = result.comparison.map((r: { total_rp_per_kwh: number }) => r.total_rp_per_kwh);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    }, TIMEOUT);

    it('includes summary with cheapest and spread', async () => {
      const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351', '6621'],
      }));
      expect(result.summary.cheapest).toBeTruthy();
      expect(result.summary.most_expensive).toBeTruthy();
      expect(typeof result.summary.spread_rp_per_kwh).toBe('number');
      expect(result.summary.spread_rp_per_kwh).toBeGreaterThanOrEqual(0);
    }, TIMEOUT);

    it('includes rank field on each entry', async () => {
      const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351'],
      }));
      expect(result.comparison[0].rank).toBe(1);
      expect(result.comparison[1].rank).toBe(2);
    }, TIMEOUT);

    it('includes canton info in each entry', async () => {
      const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351'],
      }));
      for (const entry of result.comparison) {
        expect(entry.canton).toBeTruthy();
      }
    }, TIMEOUT);

    it('includes source link', async () => {
      const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351'],
      }));
      expect(result.source).toContain('elcom.admin.ch');
    }, TIMEOUT);

    it('works for H1 household category', async () => {
      const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351'],
        category: 'H1',
      }));
      expect(result.summary.category).toBe('H1');
      expect(result.comparison.length).toBeGreaterThan(0);
    }, TIMEOUT);

    it('response is under 50K chars for 5 municipalities', async () => {
      // Zürich, Bern, Genève, Basel, Lausanne
      const raw = await handleEnergy('compare_electricity_tariffs', {
        municipalities: ['261', '351', '6621', '2701', '5586'],
      });
      expect(raw.length).toBeLessThan(50000);
    }, TIMEOUT);
  });
});
