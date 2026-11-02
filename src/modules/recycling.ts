// Recycling & Waste Collection module — powered by OpenERZ (openerz.metaodi.ch)
// Data source: https://openerz.metaodi.ch — Zurich city waste collection calendar
// Coverage: Zurich city ZIP codes (8001–8099)
// No authentication required

import { swissToday } from "../utils/date.js";

import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://openerz.metaodi.ch/api";

// ── Waste type descriptions ──────────────────────────────────────────────────

export const WASTE_TYPE_DESCRIPTIONS: Record<string, string> = {
  waste:     "General household waste (Kehricht / ordures ménagères)",
  cardboard: "Cardboard and corrugated board (Karton / carton)",
  paper:     "Paper and newspapers (Papier / papier)",
  organic:   "Organic / food waste (Bioabfall / déchets organiques)",
  textile:   "Clothing and textiles (Textilien / textiles)",
  special:   "Special waste / hazardous materials (Sonderabfall / déchets spéciaux)",
  mobile:    "Mobile collection point (mobiler Sammelstelle / point de collecte mobile)",
};

// ── Supported types list ─────────────────────────────────────────────────────

export const SUPPORTED_WASTE_TYPES = Object.keys(WASTE_TYPE_DESCRIPTIONS);

// ── API response types ───────────────────────────────────────────────────────

interface OpenErzMetadata {
  total_count: number;
  row_count: number;
}

interface OpenErzEntry {
  date: string;
  waste_type: string;
  zip: number;
  area: string;
  station: string;
  region: string;
  description: string;
}

interface OpenErzResponse {
  _metadata: OpenErzMetadata;
  result: OpenErzEntry[];
}

// ── Output types ─────────────────────────────────────────────────────────────

interface CollectionEntry {
  date: string;
  waste_type: string;
  zip: number;
  description?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Today in Switzerland, not on whatever timezone the server runs in. */
function todayISO(): string {
  return swissToday();
}

/** Returns the first and last day of a given month/year as YYYY-MM-DD */
function monthRange(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  // Last day: go to first of next month, subtract one day
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** Compact a raw API entry for output */
function compactEntry(e: OpenErzEntry): CollectionEntry {
  const entry: CollectionEntry = {
    date: e.date,
    waste_type: e.waste_type,
    zip: e.zip,
  };
  if (e.description && e.description.trim()) {
    entry.description = e.description.trim();
  }
  return entry;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

/** Fetch collection entries for a zip, optional type filter, date range, and row limit */
async function fetchCalendar(params: {
  zip: string;
  types?: string;
  start: string;
  end?: string;
  limit?: number;
}): Promise<OpenErzEntry[]> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    zip: params.zip,
    start: params.start,
    sort: "date",
  };
  if (params.types) queryParams.types = params.types;
  if (params.end) queryParams.end = params.end;
  if (params.limit) queryParams.limit = params.limit;

  const url = buildUrl(`${BASE}/calendar.json`, queryParams);
  const data = await fetchJSON<OpenErzResponse>(url);
  return data.result ?? [];
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const recyclingTools = [
  {
    name: "get_waste_collection",
    description:
      "Upcoming waste collection dates for a ZIP code. Zurich city only (8001–8099, OpenERZ)",
    inputSchema: {
      type: "object",
      required: ["zip"],
      properties: {
        zip: {
          type: "string",
          description: "e.g. 8004",
        },
        type: {
          type: "string",
          description: "Omit for all",
          enum: SUPPORTED_WASTE_TYPES,
        },
        limit: {
          type: "number",
          description: "max 100",
          default: 5,
        },
      },
    },
  },
  {
    name: "list_waste_types",
    description:
      "List waste collection types. Zurich city only (OpenERZ)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_waste_calendar",
    description:
      "Monthly waste collection calendar for a ZIP code. Zurich city only (8001–8099, OpenERZ)",
    inputSchema: {
      type: "object",
      required: ["zip"],
      properties: {
        zip: {
          type: "string",
          description: "e.g. 8004",
        },
        month: {
          type: "number",
          description: "1–12, default: current month",
        },
        year: {
          type: "number",
          description: "default: current year",
        },
      },
    },
  },
];

// ── Handler ──────────────────────────────────────────────────────────────────

export async function handleRecycling(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_waste_collection": {
      const zip = String(args.zip ?? "").trim();
      if (!zip) {
        throw new Error("zip is required (e.g. '8001')");
      }
      const type = args.type as string | undefined;
      const limit = typeof args.limit === "number" ? Math.max(1, Math.min(args.limit, 100)) : 5;

      const entries = await fetchCalendar({
        zip,
        types: type,
        start: todayISO(),
        limit,
      });

      const collections = entries.slice(0, limit).map(compactEntry);

      return JSON.stringify({
        zip,
        type: type ?? "all",
        upcoming: collections,
        count: collections.length,
        note: "Covers Zurich city ZIP codes 8001–8099 only.",
        source: "openerz.metaodi.ch",
      });
    }

    case "list_waste_types": {
      const types = SUPPORTED_WASTE_TYPES.map((t) => ({
        type: t,
        description: WASTE_TYPE_DESCRIPTIONS[t],
      }));

      return JSON.stringify({
        types,
        count: types.length,
        note: "Covers Zurich city ZIP codes 8001–8099 only.",
        source: "openerz.metaodi.ch",
      });
    }

    case "get_waste_calendar": {
      const zip = String(args.zip ?? "").trim();
      if (!zip) {
        throw new Error("zip is required (e.g. '8001')");
      }

      const [thisYear, thisMonth] = swissToday().split("-").map(Number);
      const month = typeof args.month === "number"
        ? Math.max(1, Math.min(Math.trunc(args.month), 12))
        : thisMonth;
      const year = typeof args.year === "number" ? Math.trunc(args.year) : thisYear;

      const { start, end } = monthRange(month, year);

      const entries = await fetchCalendar({ zip, start, end });
      const compact = entries.map(compactEntry);

      // Group by date
      const byDate: Record<string, string[]> = {};
      for (const e of compact) {
        if (!byDate[e.date]) byDate[e.date] = [];
        byDate[e.date].push(e.waste_type);
      }

      const calendar = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, types]) => ({ date, types }));

      const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });

      return JSON.stringify({
        zip,
        month,
        year,
        month_name: monthName,
        calendar,
        total_events: compact.length,
        collection_days: calendar.length,
        note: "Covers Zurich city ZIP codes 8001–8099 only.",
        source: "openerz.metaodi.ch",
      });
    }

    default:
      throw new Error(`Unknown recycling tool: ${name}`);
  }
}
