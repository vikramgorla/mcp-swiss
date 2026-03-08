// Swiss National Bank (SNB) Exchange Rates module
// Data source: https://data.snb.ch/api/ (Swiss National Bank open data, no auth required)
// Endpoints:
//   Dimensions: https://data.snb.ch/api/cube/devkum/dimensions/en
//   Monthly data: https://data.snb.ch/api/cube/devkum/data/csv/en
//   Annual data:  https://data.snb.ch/api/cube/devkua/data/csv/en

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchJSON } from "../utils/http.js";

// ── Constants ────────────────────────────────────────────────────────────────

const SNB_BASE = "https://data.snb.ch/api";
const SNB_MONTHLY_CSV = `${SNB_BASE}/cube/devkum/data/csv/en`;
const SNB_DIMENSIONS = `${SNB_BASE}/cube/devkum/dimensions/en`;

// ── Types ────────────────────────────────────────────────────────────────────

interface DimensionItem {
  id: string;
  name: string;
  dimensionItems?: DimensionItem[];
}

interface DimensionsResponse {
  cubeId: string;
  dimensions: Array<{
    id: string;
    name: string;
    dimensionItems: DimensionItem[];
  }>;
}

interface RateEntry {
  date: string;
  rate: number;
}

interface CurrencyInfo {
  code: string;
  name: string;
  region: string;
  /** Units per CHF (e.g. "EUR1" = 1 EUR, "JPY100" = 100 JPY) */
  seriesId: string;
  /** Multiplier: 1 for single-unit currencies, 100 for per-100 series */
  units: number;
}

// ── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Parse SNB monthly CSV. Format:
 *   "CubeId";"devkum"
 *   "PublishingDate";"2026-03-02 14:30"
 *   (blank line)
 *   "Date";"D0";"D1";"Value"
 *   "2026-02";"M0";"EUR1";"0.91406"
 *
 * D0 = M0 (monthly average) | M1 (end of month)
 * We use M0 (monthly average) for consistency.
 */
function parseSnbCsv(csv: string): Map<string, RateEntry[]> {
  // Map: seriesId (e.g. "EUR1") → sorted array of {date, rate}
  const result = new Map<string, RateEntry[]>();

  const lines = csv.split("\n");
  let headerFound = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect header row
    if (line.startsWith('"Date"')) {
      headerFound = true;
      continue;
    }
    if (!headerFound) continue;

    // Parse data row: "Date";"D0";"D1";"Value"
    const parts = line.split(";").map((p) => p.replace(/^"|"$/g, "").trim());
    if (parts.length < 4) continue;

    const [date, d0, seriesId, valueStr] = parts;

    // Only use monthly averages (M0)
    if (d0 !== "M0") continue;

    // Skip empty values
    if (!valueStr) continue;

    const rate = parseFloat(valueStr);
    if (isNaN(rate)) continue;

    const entries = result.get(seriesId) ?? [];
    entries.push({ date, rate });
    result.set(seriesId, entries);
  }

  return result;
}

/**
 * Flatten nested dimension items into a currency list.
 */
function flattenCurrencies(items: DimensionItem[], region: string): CurrencyInfo[] {
  const result: CurrencyInfo[] = [];

  for (const item of items) {
    if (item.dimensionItems) {
      // This is a region grouping
      result.push(...flattenCurrencies(item.dimensionItems, item.name));
    } else {
      // Leaf item = actual currency series (e.g. "EUR1", "JPY100")
      const seriesId = item.id;
      // Determine units: if ends with "100" it's a per-100 series
      const units = seriesId.endsWith("100") ? 100 : 1;
      // Extract currency code: remove trailing "1" or "100"
      const code = seriesId.replace(/100$/, "").replace(/1$/, "");
      result.push({
        code,
        name: item.name,
        region,
        seriesId,
        units,
      });
    }
  }

  return result;
}

/**
 * Find the SNB series ID for a given currency code (e.g. "EUR" → "EUR1", "JPY" → "JPY100").
 */
function findSeriesId(currencyCode: string, currencies: CurrencyInfo[]): CurrencyInfo | undefined {
  const upper = currencyCode.toUpperCase();
  return currencies.find((c) => c.code === upper);
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

let _dimensionsCache: CurrencyInfo[] | null = null;
let _dimensionsCachedAt = 0;
const DIMENSIONS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (dimensions rarely change)

async function fetchDimensions(): Promise<CurrencyInfo[]> {
  const now = Date.now();
  if (_dimensionsCache && now - _dimensionsCachedAt < DIMENSIONS_CACHE_TTL_MS) {
    return _dimensionsCache;
  }
  const data = await fetchJSON<DimensionsResponse>(SNB_DIMENSIONS);
  // D1 dimension contains currency items; skip D0 (monthly average/end-of-month)
  const d1 = data.dimensions.find((d) => d.id === "D1");
  if (!d1) {
    throw new Error("SNB dimensions response missing D1 (currency) dimension");
  }
  _dimensionsCache = flattenCurrencies(d1.dimensionItems, "");
  _dimensionsCachedAt = now;
  return _dimensionsCache;
}

// ── In-memory cache (5-minute TTL) ───────────────────────────────────────────
let _ratesMapCache: Map<string, RateEntry[]> | null = null;
let _ratesMapCachedAt = 0;
const RATES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Clear in-memory caches (for testing) */
export function clearSnbCache(): void {
  _ratesMapCache = null;
  _ratesMapCachedAt = 0;
  _dimensionsCache = null;
  _dimensionsCachedAt = 0;
}

async function fetchRatesMap(): Promise<Map<string, RateEntry[]>> {
  const now = Date.now();
  if (_ratesMapCache && now - _ratesMapCachedAt < RATES_CACHE_TTL_MS) {
    return _ratesMapCache;
  }

  const response = await fetch(SNB_MONTHLY_CSV, {
    headers: {
      "Accept": "text/csv,text/plain,*/*",
      "User-Agent": "mcp-swiss/0.1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} — SNB CSV`);
  }

  const csv = await response.text();
  _ratesMapCache = parseSnbCsv(csv);
  _ratesMapCachedAt = now;
  return _ratesMapCache;
}

// ── Tool implementations ─────────────────────────────────────────────────────

async function handleListCurrencies(): Promise<string> {
  const currencies = await fetchDimensions();

  const result = currencies.map((c) => ({
    code: c.code,
    name: c.name,
    region: c.region || undefined,
    units: c.units === 100 ? `CHF per 100 ${c.code}` : `CHF per 1 ${c.code}`,
    seriesId: c.seriesId,
  }));

  return JSON.stringify(
    {
      currencies: result,
      count: result.length,
      note: "All rates are CHF per unit. Series with '100' suffix (e.g. JPY100) show CHF per 100 units.",
      source: "https://data.snb.ch",
    },
    null,
    2
  );
}

async function handleGetExchangeRate(currency: string): Promise<string> {
  if (!currency?.trim()) {
    throw new Error("currency is required (e.g. 'EUR', 'USD', 'GBP')");
  }

  const [currencies, ratesMap] = await Promise.all([fetchDimensions(), fetchRatesMap()]);

  const info = findSeriesId(currency, currencies);
  if (!info) {
    const availableCodes = currencies.map((c) => c.code).join(", ");
    throw new Error(
      `Currency '${currency.toUpperCase()}' not found. Available currencies: ${availableCodes}`
    );
  }

  const entries = ratesMap.get(info.seriesId);
  if (!entries || entries.length === 0) {
    return JSON.stringify(
      {
        error: "No exchange rate data available",
        currency: currency.toUpperCase(),
        hint: "The SNB may not publish rates for this currency for recent periods.",
        source: "https://data.snb.ch",
      },
      null,
      2
    );
  }

  // Latest entry (CSV is in chronological order, last = most recent)
  const latest = entries[entries.length - 1];

  return JSON.stringify(
    {
      currency: info.code,
      currencyName: info.name,
      date: latest.date,
      rate: latest.rate,
      units: info.units,
      description:
        info.units === 100
          ? `1 CHF = ${(info.units / latest.rate).toFixed(4)} ${info.code} | 100 ${info.code} = ${latest.rate} CHF`
          : `1 ${info.code} = ${latest.rate} CHF`,
      note:
        info.units === 100
          ? `Rate is CHF per 100 ${info.code} (monthly average)`
          : `Rate is CHF per 1 ${info.code} (monthly average)`,
      source: "https://data.snb.ch",
    },
    null,
    2
  );
}

async function handleGetExchangeRateHistory(
  currency: string,
  from?: string,
  to?: string
): Promise<string> {
  if (!currency?.trim()) {
    throw new Error("currency is required (e.g. 'EUR', 'USD', 'GBP')");
  }

  const [currencies, ratesMap] = await Promise.all([fetchDimensions(), fetchRatesMap()]);

  const info = findSeriesId(currency, currencies);
  if (!info) {
    const availableCodes = currencies.map((c) => c.code).join(", ");
    throw new Error(
      `Currency '${currency.toUpperCase()}' not found. Available currencies: ${availableCodes}`
    );
  }

  let entries = ratesMap.get(info.seriesId) ?? [];

  if (entries.length === 0) {
    return JSON.stringify(
      {
        error: "No historical data available",
        currency: currency.toUpperCase(),
        source: "https://data.snb.ch",
      },
      null,
      2
    );
  }

  // Filter by date range if provided (dates are "YYYY-MM" format)
  if (from) {
    entries = entries.filter((e) => e.date >= from);
  }
  if (to) {
    entries = entries.filter((e) => e.date <= to);
  }

  // If no date range provided, limit to most recent 90 entries
  if (!from && !to && entries.length > 90) {
    entries = entries.slice(-90);
  }

  if (entries.length === 0) {
    return JSON.stringify(
      {
        error: "No data in the specified date range",
        currency: currency.toUpperCase(),
        from: from ?? null,
        to: to ?? null,
        source: "https://data.snb.ch",
      },
      null,
      2
    );
  }

  // Compute simple stats
  const rates = entries.map((e) => e.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;

  return JSON.stringify(
    {
      currency: info.code,
      currencyName: info.name,
      units: info.units,
      unitDescription:
        info.units === 100
          ? `CHF per 100 ${info.code} (monthly average)`
          : `CHF per 1 ${info.code} (monthly average)`,
      from: entries[0].date,
      to: entries[entries.length - 1].date,
      count: entries.length,
      history: entries,
      stats: {
        min: +minRate.toFixed(5),
        max: +maxRate.toFixed(5),
        average: +avgRate.toFixed(5),
      },
      source: "https://data.snb.ch",
    },
    null,
    2
  );
}

// ── Tool registration ────────────────────────────────────────────────────────

export function registerSnbTools(server: McpServer): void {
  // ── list_currencies ───────────────────────────────────────────────────────

  server.tool(
    "list_currencies",
    "List all currencies available from the Swiss National Bank (SNB) for CHF exchange rate data. Returns currency codes, names, and regions.",
    {},
    async () => {
      const result = await handleListCurrencies();
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ── get_exchange_rate ─────────────────────────────────────────────────────

  server.tool(
    "get_exchange_rate",
    "Get the current CHF exchange rate for a currency from the Swiss National Bank (SNB). Returns the latest monthly average rate and currency details.",
    {
      currency: z
        .string()
        .describe(
          "ISO 4217 currency code (e.g. 'EUR', 'USD', 'GBP', 'JPY'). Use list_currencies to see all available codes."
        ),
    },
    async ({ currency }) => {
      const result = await handleGetExchangeRate(currency);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ── get_exchange_rate_history ─────────────────────────────────────────────

  server.tool(
    "get_exchange_rate_history",
    "Get historical CHF exchange rates for a currency from the Swiss National Bank (SNB). Returns monthly average rates with optional date filtering. Without date range, returns the most recent 90 months.",
    {
      currency: z
        .string()
        .describe(
          "ISO 4217 currency code (e.g. 'EUR', 'USD', 'GBP'). Use list_currencies to see all available codes."
        ),
      from: z
        .string()
        .optional()
        .describe(
          "Start date in YYYY-MM format (e.g. '2020-01'). Optional — defaults to 90 months ago if not provided."
        ),
      to: z
        .string()
        .optional()
        .describe("End date in YYYY-MM format (e.g. '2026-02'). Optional — defaults to latest available."),
    },
    async ({ currency, from, to }) => {
      const result = await handleGetExchangeRateHistory(currency, from, to);
      return { content: [{ type: "text", text: result }] };
    }
  );
}

// ── Named exports for testing ─────────────────────────────────────────────────

export {
  handleListCurrencies,
  handleGetExchangeRate,
  handleGetExchangeRateHistory,
  parseSnbCsv,
  flattenCurrencies,
};

// ── Adapter exports for index.ts integration ──────────────────────────────────

export const snbTools = [
  {
    name: "list_currencies",
    description:
      "List all currencies available from the Swiss National Bank (SNB) for CHF exchange rate data. Returns currency codes, names, and regions.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_exchange_rate",
    description:
      "Get the current CHF exchange rate for a currency from the Swiss National Bank (SNB). Returns the latest monthly average rate and currency details.",
    inputSchema: {
      type: "object" as const,
      required: ["currency"],
      properties: {
        currency: {
          type: "string",
          description: "ISO 4217 currency code (e.g. 'EUR', 'USD', 'GBP', 'JPY'). Use list_currencies to see all available codes.",
        },
      },
    },
  },
  {
    name: "get_exchange_rate_history",
    description:
      "Get historical CHF exchange rates for a currency from the Swiss National Bank (SNB). Returns monthly average rates with optional date filtering. Without date range, returns the most recent 90 months.",
    inputSchema: {
      type: "object" as const,
      required: ["currency"],
      properties: {
        currency: {
          type: "string",
          description: "ISO 4217 currency code (e.g. 'EUR', 'USD', 'GBP'). Use list_currencies to see all available codes.",
        },
        from: {
          type: "string",
          description: "Start date in YYYY-MM format (e.g. '2020-01'). Optional.",
        },
        to: {
          type: "string",
          description: "End date in YYYY-MM format (e.g. '2026-02'). Optional.",
        },
      },
    },
  },
];

export async function handleSnb(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "list_currencies":
      return handleListCurrencies();
    case "get_exchange_rate":
      return handleGetExchangeRate(args.currency as string);
    case "get_exchange_rate_history":
      return handleGetExchangeRateHistory(
        args.currency as string,
        args.from as string | undefined,
        args.to as string | undefined
      );
    default:
      throw new Error(`Unknown SNB tool: ${name}`);
  }
}
