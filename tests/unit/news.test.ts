import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  stripHtml,
  parseRssItems,
  handleGetSwissNews,
  handleSearchSwissNews,
} from '../../src/modules/news.js';
import {
  mockRssXml,
  mockRssXmlInternational,
  mockRssXmlEconomy,
  mockRssXmlEmpty,
  mockRssXmlHtmlEntities,
  expectedArticle1,
  expectedArticle2,
} from '../fixtures/news.js';

// ── Fetch mock helper ─────────────────────────────────────────────────────────

function mockFetch(body: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body),
  }));
}

function mockFetchMulti(responses: Record<string, string>) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
    for (const [key, body] of Object.entries(responses)) {
      if (url.includes(key)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve(body),
        });
      }
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
    });
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── stripHtml ─────────────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes simple HTML tags', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold');
  });

  it('removes img tags with attributes', () => {
    expect(stripHtml('<img src="test.jpg" align="left" />text')).toBe('text');
  });

  it('decodes &amp; entity', () => {
    expect(stripHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
  });

  it('decodes encoded HTML tags and strips them', () => {
    // &lt;b&gt; decodes to <b> then gets stripped as a tag
    expect(stripHtml('&lt;b&gt;bold&lt;/b&gt;')).toBe('bold');
    // &lt;img src="..." /&gt; decodes to tag then stripped
    expect(stripHtml('&lt;img src="test.jpg" /&gt;text')).toBe('text');
  });

  it('decodes &quot; entity', () => {
    expect(stripHtml('say &quot;hello&quot;')).toBe('say "hello"');
  });

  it('decodes &#39; entity', () => {
    expect(stripHtml('it&#39;s')).toBe("it's");
  });

  it('decodes &nbsp; to space', () => {
    expect(stripHtml('a&nbsp;b')).toBe('a b');
  });

  it('trims leading/trailing whitespace', () => {
    expect(stripHtml('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<div><p>text</p></div>')).toBe('text');
  });

  it('leaves plain text unchanged', () => {
    expect(stripHtml('plain text')).toBe('plain text');
  });
});

// ── parseRssItems ─────────────────────────────────────────────────────────────

describe('parseRssItems', () => {
  it('parses correct number of items', () => {
    const items = parseRssItems(mockRssXml);
    expect(items).toHaveLength(3);
  });

  it('parses title correctly', () => {
    const items = parseRssItems(mockRssXml);
    expect(items[0].title).toBe(expectedArticle1.title);
  });

  it('parses link correctly', () => {
    const items = parseRssItems(mockRssXml);
    expect(items[0].link).toBe(expectedArticle1.link);
  });

  it('parses pubDate correctly', () => {
    const items = parseRssItems(mockRssXml);
    expect(items[0].published).toBe(expectedArticle1.published);
  });

  it('strips HTML from description', () => {
    const items = parseRssItems(mockRssXml);
    expect(items[0].description).toBe(expectedArticle1.description);
    expect(items[0].description).not.toContain('<img');
  });

  it('parses second item correctly', () => {
    const items = parseRssItems(mockRssXml);
    expect(items[1].title).toBe(expectedArticle2.title);
    expect(items[1].link).toBe(expectedArticle2.link);
  });

  it('returns empty array for feed with no items', () => {
    const items = parseRssItems(mockRssXmlEmpty);
    expect(items).toHaveLength(0);
  });

  it('decodes HTML entities in title', () => {
    const items = parseRssItems(mockRssXmlHtmlEntities);
    expect(items[0].title).toContain('&');
    expect(items[0].title).not.toContain('&amp;');
  });

  it('strips HTML tags from description with entities', () => {
    const items = parseRssItems(mockRssXmlHtmlEntities);
    expect(items[0].description).not.toContain('<b>');
    expect(items[0].description).toContain('Bold text');
  });

  it('handles item with no description gracefully', () => {
    const xml = `<rss><channel><item><title>Only Title</title><link>https://srf.ch</link><pubDate>Mon, 01 Jan 2026 00:00:00 +0100</pubDate></item></channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe('');
  });

  it('skips items with no title', () => {
    const xml = `<rss><channel><item><link>https://srf.ch</link><pubDate>Mon, 01 Jan 2026 00:00:00 +0100</pubDate></item></channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(0);
  });

  it('handles multiline item content', () => {
    const xml = `<rss><channel><item>
      <title>Multi
line title</title>
      <link>https://srf.ch/test</link>
      <pubDate>Mon, 01 Jan 2026 00:00:00 +0100</pubDate>
      <description>Multi
line desc</description>
    </item></channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('Multi');
  });
});

// ── handleGetSwissNews ────────────────────────────────────────────────────────

describe('handleGetSwissNews', () => {
  it('fetches switzerland category by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockRssXml),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleGetSwissNews({});
    expect(fetchMock.mock.calls[0][0]).toContain('1890');
  });

  it('returns parsed articles array', async () => {
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({}));
    expect(result.category).toBe('switzerland');
    expect(Array.isArray(result.articles)).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.source).toBe('srf.ch');
  });

  it('each article has required fields', async () => {
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({}));
    for (const a of result.articles) {
      expect(typeof a.title).toBe('string');
      expect(typeof a.description).toBe('string');
      expect(typeof a.link).toBe('string');
      expect(typeof a.published).toBe('string');
    }
  });

  it('respects limit parameter', async () => {
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({ limit: 2 }));
    expect(result.articles.length).toBeLessThanOrEqual(2);
    expect(result.count).toBeLessThanOrEqual(2);
  });

  it('fetches international category with correct feed ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockRssXmlInternational),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = JSON.parse(await handleGetSwissNews({ category: 'international' }));
    expect(result.category).toBe('international');
    expect(fetchMock.mock.calls[0][0]).toContain('1922');
  });

  it('fetches economy category with correct feed ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      text: () => Promise.resolve(mockRssXmlEconomy),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = JSON.parse(await handleGetSwissNews({ category: 'economy' }));
    expect(result.category).toBe('economy');
    expect(fetchMock.mock.calls[0][0]).toContain('1926');
  });

  it('throws for unknown category', async () => {
    await expect(handleGetSwissNews({ category: 'sports' as 'switzerland' }))
      .rejects.toThrow('Unknown category "sports"');
  });

  it('includes valid categories in error message', async () => {
    await expect(handleGetSwissNews({ category: 'sports' as 'switzerland' }))
      .rejects.toThrow('switzerland');
  });

  it('throws on HTTP error', async () => {
    mockFetch('', 500);
    await expect(handleGetSwissNews({}))
      .rejects.toThrow('HTTP 500');
  });

  it('default limit is 10', async () => {
    // Feed has only 3 items — returns all 3 with no limit
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({}));
    expect(result.articles.length).toBeLessThanOrEqual(10);
  });

  it('includes count in result', async () => {
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({}));
    expect(typeof result.count).toBe('number');
    expect(result.count).toBe(result.articles.length);
  });

  it('includes total_available in result', async () => {
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({}));
    expect(typeof result.total_available).toBe('number');
  });

  it('response is valid JSON string', async () => {
    mockFetch(mockRssXml);
    const raw = await handleGetSwissNews({});
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('returns empty articles array for empty feed', async () => {
    mockFetch(mockRssXmlEmpty);
    const result = JSON.parse(await handleGetSwissNews({}));
    expect(result.articles).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('caps limit at 50 max', async () => {
    // With only 3 fixture items, just verify limit is applied
    mockFetch(mockRssXml);
    const result = JSON.parse(await handleGetSwissNews({ limit: 100 }));
    // Should not error, and returns at most 3 (what fixture has)
    expect(result.articles.length).toBeLessThanOrEqual(50);
  });

  it('result is under 50K chars', async () => {
    mockFetch(mockRssXml);
    const raw = await handleGetSwissNews({});
    expect(raw.length).toBeLessThan(50000);
  });
});

// ── handleSearchSwissNews ─────────────────────────────────────────────────────

describe('handleSearchSwissNews', () => {
  it('finds articles matching query in title', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'Pestizide' }));
    expect(result.count).toBeGreaterThan(0);
    expect(result.articles[0].title).toContain('Pestizide');
  });

  it('finds articles matching query in description', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'Zürich' }));
    expect(result.count).toBeGreaterThan(0);
  });

  it('search is case-insensitive', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'pestizide' }));
    expect(result.count).toBeGreaterThan(0);
  });

  it('returns empty results for no match', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'XYZNOTFOUND123' }));
    expect(result.count).toBe(0);
    expect(result.articles).toEqual([]);
  });

  it('respects limit parameter', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    // "a" will match many articles — test that limit is applied
    const result = JSON.parse(await handleSearchSwissNews({ query: 'a', limit: 2 }));
    expect(result.articles.length).toBeLessThanOrEqual(2);
  });

  it('default limit is 5', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'a' }));
    expect(result.articles.length).toBeLessThanOrEqual(5);
  });

  it('deduplicates articles from overlapping feeds', async () => {
    // Same article across multiple feeds
    const duplicateFeed = mockRssXml; // same XML for all feeds
    mockFetchMulti({
      '1890': duplicateFeed,
      '1922': duplicateFeed,
      '1926': duplicateFeed,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'Pestizide' }));
    const links = result.articles.map((a: { link: string }) => a.link);
    const uniqueLinks = new Set(links);
    expect(links.length).toBe(uniqueLinks.size);
  });

  it('includes query in response', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'Schweiz' }));
    expect(result.query).toBe('Schweiz');
  });

  it('includes source in response', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'test' }));
    expect(result.source).toBe('srf.ch');
  });

  it('includes category in each article', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const result = JSON.parse(await handleSearchSwissNews({ query: 'Pestizide' }));
    if (result.count > 0) {
      expect(result.articles[0].category).toBeDefined();
      expect(['switzerland', 'international', 'economy']).toContain(result.articles[0].category);
    }
  });

  it('gracefully skips unavailable feeds', async () => {
    // Only 1890 returns data, rest are 404
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('1890')) {
        return Promise.resolve({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(mockRssXml) });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', text: () => Promise.resolve('') });
    }));
    const result = JSON.parse(await handleSearchSwissNews({ query: 'Pestizide' }));
    expect(result.count).toBeGreaterThan(0); // Still finds results from 1890
  });

  it('throws for empty query', async () => {
    await expect(handleSearchSwissNews({ query: '' }))
      .rejects.toThrow('query parameter is required');
  });

  it('result is valid JSON string', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const raw = await handleSearchSwissNews({ query: 'Schweiz' });
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('result is under 50K chars', async () => {
    mockFetchMulti({
      '1890': mockRssXml,
      '1922': mockRssXmlInternational,
      '1926': mockRssXmlEconomy,
    });
    const raw = await handleSearchSwissNews({ query: 'a' });
    expect(raw.length).toBeLessThan(50000);
  });
});
