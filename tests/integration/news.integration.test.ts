// Integration tests — hit the real SRF RSS API
// Run with: npx vitest run tests/integration/news.integration.test.ts

import { describe, it, expect } from 'vitest';
import { handleGetSwissNews, handleSearchSwissNews } from '../../src/modules/news.js';

describe('Swiss News API (live — srf.ch)', () => {

  // ── get_swiss_news ─────────────────────────────────────────────────────────

  describe('get_swiss_news', () => {
    it('returns swiss news with valid structure', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland' }));
      expect(result.category).toBe('switzerland');
      expect(result.source).toBe('srf.ch');
      expect(Array.isArray(result.articles)).toBe(true);
      expect(typeof result.count).toBe('number');
      expect(typeof result.total_available).toBe('number');
    });

    it('returns at least 1 article for switzerland', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland' }));
      expect(result.count).toBeGreaterThan(0);
    });

    it('each article has required fields', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland' }));
      for (const a of result.articles) {
        expect(typeof a.title).toBe('string');
        expect(a.title.length).toBeGreaterThan(0);
        expect(typeof a.description).toBe('string');
        expect(typeof a.link).toBe('string');
        expect(a.link).toMatch(/^https?:\/\//);
        expect(typeof a.published).toBe('string');
      }
    });

    it('no article has raw HTML in title or description', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland' }));
      for (const a of result.articles) {
        expect(a.title).not.toMatch(/<[^>]+>/);
        expect(a.description).not.toMatch(/<[^>]+>/);
      }
    });

    it('respects limit=3 correctly', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland', limit: 3 }));
      expect(result.articles.length).toBeLessThanOrEqual(3);
      expect(result.count).toBeLessThanOrEqual(3);
    });

    it('returns international news', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'international' }));
      expect(result.category).toBe('international');
      expect(result.count).toBeGreaterThan(0);
    });

    it('returns economy news', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'economy' }));
      expect(result.category).toBe('economy');
      expect(result.count).toBeGreaterThan(0);
    });

    it('default category is switzerland', async () => {
      const result = JSON.parse(await handleGetSwissNews({}));
      expect(result.category).toBe('switzerland');
      expect(result.count).toBeGreaterThan(0);
    });

    it('response is under 50K chars', async () => {
      const raw = await handleGetSwissNews({ category: 'switzerland' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('economy feed response is under 50K chars', async () => {
      const raw = await handleGetSwissNews({ category: 'economy' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('international feed response is under 50K chars', async () => {
      const raw = await handleGetSwissNews({ category: 'international' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('articles have non-empty titles', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland' }));
      for (const a of result.articles) {
        expect(a.title.trim().length).toBeGreaterThan(0);
      }
    });

    it('links point to srf.ch domain', async () => {
      const result = JSON.parse(await handleGetSwissNews({ category: 'switzerland' }));
      for (const a of result.articles) {
        expect(a.link).toContain('srf.ch');
      }
    });
  });

  // ── search_swiss_news ──────────────────────────────────────────────────────

  describe('search_swiss_news', () => {
    it('returns valid search result structure', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'Schweiz' }));
      expect(typeof result.query).toBe('string');
      expect(result.query).toBe('Schweiz');
      expect(Array.isArray(result.articles)).toBe(true);
      expect(typeof result.count).toBe('number');
      expect(result.source).toBe('srf.ch');
    });

    it('finds news about Switzerland', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'Schweiz' }));
      expect(result.count).toBeGreaterThan(0);
    });

    it('respects limit parameter', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'Schweiz', limit: 2 }));
      expect(result.articles.length).toBeLessThanOrEqual(2);
    });

    it('search is case-insensitive', async () => {
      const lower = JSON.parse(await handleSearchSwissNews({ query: 'schweiz' }));
      const upper = JSON.parse(await handleSearchSwissNews({ query: 'SCHWEIZ' }));
      // Both should return results
      expect(lower.count).toBeGreaterThan(0);
      expect(upper.count).toBeGreaterThan(0);
    });

    it('returns empty array for unlikely query', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'xyzqwerty99999notfound' }));
      expect(result.count).toBe(0);
      expect(result.articles).toEqual([]);
    });

    it('no article has raw HTML in title or description', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'Schweiz' }));
      for (const a of result.articles) {
        expect(a.title).not.toMatch(/<[^>]+>/);
        expect(a.description).not.toMatch(/<[^>]+>/);
      }
    });

    it('search response is under 50K chars', async () => {
      const raw = await handleSearchSwissNews({ query: 'a' });
      expect(raw.length).toBeLessThan(50000);
    });

    it('each article has a category field', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'Schweiz' }));
      if (result.count > 0) {
        for (const a of result.articles) {
          expect(['switzerland', 'international', 'economy']).toContain(a.category);
        }
      }
    });

    it('no duplicate links in results', async () => {
      const result = JSON.parse(await handleSearchSwissNews({ query: 'a', limit: 20 }));
      const links = result.articles.map((a: { link: string }) => a.link);
      const uniqueLinks = new Set(links);
      expect(links.length).toBe(uniqueLinks.size);
    });
  });
});
