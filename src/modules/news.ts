import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ── SRF RSS Feed IDs ─────────────────────────────────────────────────────────
// Verified working feeds (tested March 2026)
const FEED_IDS: Record<string, number> = {
  switzerland: 1890,
  international: 1922,
  economy: 1926,
};

const BASE_URL = "https://www.srf.ch/news/bnf/rss";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NewsArticle {
  title: string;
  description: string;
  link: string;
  published: string;
}

// ── XML Parsing helpers ──────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  // First decode HTML entities so encoded tags like &lt;img&gt; become actual tags
  const decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Then strip all HTML tags
  const stripped = decoded.replace(/<[^>]+>/g, "");
  // Finally decode remaining &amp; (after tag removal, so we don't break attribute parsing)
  return stripped
    .replace(/&amp;/g, "&")
    .trim();
}

function extractField(itemXml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = re.exec(itemXml);
  return match ? match[1].trim() : "";
}

export function parseRssItems(xml: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = stripHtml(extractField(itemXml, "title"));
    const link = extractField(itemXml, "link");
    const description = stripHtml(extractField(itemXml, "description"));
    const pubDate = extractField(itemXml, "pubDate");

    if (title) {
      items.push({
        title,
        description,
        link,
        published: pubDate,
      });
    }
  }

  return items;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchFeed(feedId: number): Promise<string> {
  const url = `${BASE_URL}/${feedId}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "mcp-swiss/1.0.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
  }
  return response.text();
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

export async function handleGetSwissNews(args: {
  category?: string;
  limit?: number;
}): Promise<string> {
  const category = args.category ?? "switzerland";
  const limit = Math.min(args.limit ?? 10, 50);

  const feedId = FEED_IDS[category];
  if (!feedId) {
    const valid = Object.keys(FEED_IDS).join(", ");
    throw new Error(`Unknown category "${category}". Valid categories: ${valid}`);
  }

  const xml = await fetchFeed(feedId);
  const allItems = parseRssItems(xml);
  const items = allItems.slice(0, limit);

  const result = {
    category,
    count: items.length,
    total_available: allItems.length,
    articles: items,
    source: "srf.ch",
  };

  const json = JSON.stringify(result, null, 2);
  if (json.length > 49000) {
    // Truncate descriptions if needed
    const compact = {
      ...result,
      articles: items.map((a) => ({ ...a, description: a.description.slice(0, 200) })),
    };
    return JSON.stringify(compact, null, 2);
  }
  return json;
}

export async function handleSearchSwissNews(args: {
  query: string;
  limit?: number;
}): Promise<string> {
  const query = args.query.toLowerCase().trim();
  const limit = Math.min(args.limit ?? 5, 20);

  if (!query) {
    throw new Error("query parameter is required and cannot be empty");
  }

  // Search across all available feeds
  const allArticles: (NewsArticle & { category: string })[] = [];

  await Promise.all(
    Object.entries(FEED_IDS).map(async ([cat, feedId]) => {
      try {
        const xml = await fetchFeed(feedId);
        const items = parseRssItems(xml);
        for (const item of items) {
          allArticles.push({ ...item, category: cat });
        }
      } catch {
        // Skip unavailable feeds silently
      }
    })
  );

  // Filter by query (title or description)
  const matched = allArticles.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
  );

  // Deduplicate by link
  const seen = new Set<string>();
  const unique = matched.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  const results = unique.slice(0, limit);

  const result = {
    query: args.query,
    count: results.length,
    articles: results,
    source: "srf.ch",
  };

  return JSON.stringify(result, null, 2);
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerNewsTools(server: McpServer): void {
  server.tool(
    "get_swiss_news",
    "Get the latest Swiss news headlines from SRF (Schweizer Radio und Fernsehen). Returns top news articles with title, description, link, and publication date.",
    {
      category: z
        .enum(["switzerland", "international", "economy"])
        .optional()
        .describe(
          'News category. "switzerland" = domestic Swiss news (default), "international" = world news, "economy" = business & economy.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of articles to return (default: 10, max: 50)"),
    },
    async (args) => {
      const text = await handleGetSwissNews(args);
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "search_swiss_news",
    "Search Swiss news headlines from SRF by keyword. Searches across all available news categories and returns matching articles.",
    {
      query: z.string().min(1).describe("Search keyword or phrase to find in news articles"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of results to return (default: 5, max: 20)"),
    },
    async (args) => {
      const text = await handleSearchSwissNews(args);
      return { content: [{ type: "text", text }] };
    }
  );
}
