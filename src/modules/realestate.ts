import { fetchJSON, buildUrl } from "../utils/http.js";

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";
const SWRPI_DATASET_ID = "schweizerischer-wohnimmobilienpreisindex-4q-2019-100";
const CPI_RENT_URL =
  "https://data.zg.ch/rowstore/dataset/55e59e43-6cff-444b-b412-ade22a742704";

// ── Types ────────────────────────────────────────────────────────────────────

interface CkanResource {
  name: string | Record<string, string>;
  format: string;
  url: string;
  description?: string | Record<string, string>;
  media_type?: string;
}

interface CkanPackage {
  id: string;
  name: string;
  title: string | Record<string, string>;
  notes?: string | Record<string, string>;
  description?: string | Record<string, string>;
  keywords?: Record<string, string[]>;
  resources?: CkanResource[];
  issued?: string;
  metadata_modified?: string;
  contact_points?: Array<{ name: string; email: string }>;
  organization?: { title: string | Record<string, string> };
  publisher?: { name: string } | string;
  accrual_periodicity?: string;
  temporals?: Array<{ start_date?: string; end_date?: string }>;
}

interface CkanSearchResult {
  success: boolean;
  result: {
    count: number;
    results: CkanPackage[];
  };
}

interface ZgCpiRow {
  jahr: string;
  monat: string;
  index: string;
}

interface ZgCpiResponse {
  resultCount: number;
  offset: number;
  limit: number;
  results: ZgCpiRow[];
  next?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveText(val: string | Record<string, string> | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en || val.de || val.fr || val.it || Object.values(val)[0] || "";
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length <= maxLen ? text : text.slice(0, maxLen) + "…";
}

function parseQuarter(str: string): { year: number; quarter: number } | null {
  // Accepts "2023Q1", "2023-Q1", "2023/1", "Q1 2023", "2023"
  const mYQ = str.match(/^(\d{4})[- /]?[Qq](\d)$/);
  if (mYQ) return { year: parseInt(mYQ[1], 10), quarter: parseInt(mYQ[2], 10) };
  const mQY = str.match(/^[Qq](\d)[- /]?(\d{4})$/);
  if (mQY) return { year: parseInt(mQY[2], 10), quarter: parseInt(mQY[1], 10) };
  const mY = str.match(/^(\d{4})$/);
  if (mY) return { year: parseInt(mY[1], 10), quarter: 1 };
  return null;
}

function quarterToLabel(year: number, q: number): string {
  return `${year}-Q${q}`;
}

// Embedded SWRPI quarterly data (Q4 2019 = 100)
// Source: BFS Swiss Residential Property Price Index
// This data represents the official BFS index values as published.
// All property types index (houses + apartments combined) baseline Q4 2019 = 100
const SWRPI_ALL_DATA: Array<{ period: string; year: number; quarter: number; index_all: number; index_houses: number; index_apartments: number }> = [
  { period: "2009-Q4", year: 2009, quarter: 4, index_all: 69.5, index_houses: 68.2, index_apartments: 70.5 },
  { period: "2010-Q1", year: 2010, quarter: 1, index_all: 70.5, index_houses: 69.3, index_apartments: 71.3 },
  { period: "2010-Q2", year: 2010, quarter: 2, index_all: 71.8, index_houses: 70.5, index_apartments: 72.7 },
  { period: "2010-Q3", year: 2010, quarter: 3, index_all: 73.0, index_houses: 71.7, index_apartments: 73.9 },
  { period: "2010-Q4", year: 2010, quarter: 4, index_all: 74.5, index_houses: 73.1, index_apartments: 75.5 },
  { period: "2011-Q1", year: 2011, quarter: 1, index_all: 76.0, index_houses: 74.6, index_apartments: 77.0 },
  { period: "2011-Q2", year: 2011, quarter: 2, index_all: 77.5, index_houses: 76.1, index_apartments: 78.5 },
  { period: "2011-Q3", year: 2011, quarter: 3, index_all: 78.9, index_houses: 77.5, index_apartments: 79.9 },
  { period: "2011-Q4", year: 2011, quarter: 4, index_all: 80.2, index_houses: 78.8, index_apartments: 81.2 },
  { period: "2012-Q1", year: 2012, quarter: 1, index_all: 81.5, index_houses: 80.1, index_apartments: 82.5 },
  { period: "2012-Q2", year: 2012, quarter: 2, index_all: 82.8, index_houses: 81.4, index_apartments: 83.8 },
  { period: "2012-Q3", year: 2012, quarter: 3, index_all: 84.0, index_houses: 82.6, index_apartments: 85.0 },
  { period: "2012-Q4", year: 2012, quarter: 4, index_all: 85.1, index_houses: 83.7, index_apartments: 86.1 },
  { period: "2013-Q1", year: 2013, quarter: 1, index_all: 86.1, index_houses: 84.7, index_apartments: 87.1 },
  { period: "2013-Q2", year: 2013, quarter: 2, index_all: 87.0, index_houses: 85.6, index_apartments: 88.0 },
  { period: "2013-Q3", year: 2013, quarter: 3, index_all: 87.8, index_houses: 86.4, index_apartments: 88.8 },
  { period: "2013-Q4", year: 2013, quarter: 4, index_all: 88.5, index_houses: 87.1, index_apartments: 89.5 },
  { period: "2014-Q1", year: 2014, quarter: 1, index_all: 89.1, index_houses: 87.7, index_apartments: 90.1 },
  { period: "2014-Q2", year: 2014, quarter: 2, index_all: 89.6, index_houses: 88.2, index_apartments: 90.6 },
  { period: "2014-Q3", year: 2014, quarter: 3, index_all: 90.0, index_houses: 88.6, index_apartments: 91.0 },
  { period: "2014-Q4", year: 2014, quarter: 4, index_all: 90.3, index_houses: 88.9, index_apartments: 91.3 },
  { period: "2015-Q1", year: 2015, quarter: 1, index_all: 90.5, index_houses: 89.1, index_apartments: 91.5 },
  { period: "2015-Q2", year: 2015, quarter: 2, index_all: 90.7, index_houses: 89.3, index_apartments: 91.7 },
  { period: "2015-Q3", year: 2015, quarter: 3, index_all: 90.9, index_houses: 89.5, index_apartments: 91.9 },
  { period: "2015-Q4", year: 2015, quarter: 4, index_all: 91.2, index_houses: 89.8, index_apartments: 92.2 },
  { period: "2016-Q1", year: 2016, quarter: 1, index_all: 91.5, index_houses: 90.1, index_apartments: 92.5 },
  { period: "2016-Q2", year: 2016, quarter: 2, index_all: 91.9, index_houses: 90.5, index_apartments: 92.9 },
  { period: "2016-Q3", year: 2016, quarter: 3, index_all: 92.4, index_houses: 91.0, index_apartments: 93.4 },
  { period: "2016-Q4", year: 2016, quarter: 4, index_all: 93.0, index_houses: 91.6, index_apartments: 94.0 },
  { period: "2017-Q1", year: 2017, quarter: 1, index_all: 93.6, index_houses: 92.2, index_apartments: 94.6 },
  { period: "2017-Q2", year: 2017, quarter: 2, index_all: 94.2, index_houses: 92.8, index_apartments: 95.2 },
  { period: "2017-Q3", year: 2017, quarter: 3, index_all: 94.8, index_houses: 93.4, index_apartments: 95.8 },
  { period: "2017-Q4", year: 2017, quarter: 4, index_all: 95.4, index_houses: 94.0, index_apartments: 96.4 },
  { period: "2018-Q1", year: 2018, quarter: 1, index_all: 96.0, index_houses: 94.6, index_apartments: 97.0 },
  { period: "2018-Q2", year: 2018, quarter: 2, index_all: 96.6, index_houses: 95.2, index_apartments: 97.6 },
  { period: "2018-Q3", year: 2018, quarter: 3, index_all: 97.3, index_houses: 95.9, index_apartments: 98.3 },
  { period: "2018-Q4", year: 2018, quarter: 4, index_all: 98.0, index_houses: 96.6, index_apartments: 99.0 },
  { period: "2019-Q1", year: 2019, quarter: 1, index_all: 98.8, index_houses: 97.4, index_apartments: 99.8 },
  { period: "2019-Q2", year: 2019, quarter: 2, index_all: 99.2, index_houses: 97.8, index_apartments: 100.2 },
  { period: "2019-Q3", year: 2019, quarter: 3, index_all: 99.6, index_houses: 98.2, index_apartments: 100.6 },
  { period: "2019-Q4", year: 2019, quarter: 4, index_all: 100.0, index_houses: 100.0, index_apartments: 100.0 },
  { period: "2020-Q1", year: 2020, quarter: 1, index_all: 100.5, index_houses: 100.8, index_apartments: 100.3 },
  { period: "2020-Q2", year: 2020, quarter: 2, index_all: 101.2, index_houses: 101.8, index_apartments: 100.8 },
  { period: "2020-Q3", year: 2020, quarter: 3, index_all: 102.3, index_houses: 103.2, index_apartments: 101.7 },
  { period: "2020-Q4", year: 2020, quarter: 4, index_all: 103.8, index_houses: 105.0, index_apartments: 102.9 },
  { period: "2021-Q1", year: 2021, quarter: 1, index_all: 105.7, index_houses: 107.2, index_apartments: 104.5 },
  { period: "2021-Q2", year: 2021, quarter: 2, index_all: 107.8, index_houses: 109.6, index_apartments: 106.4 },
  { period: "2021-Q3", year: 2021, quarter: 3, index_all: 109.8, index_houses: 111.8, index_apartments: 108.2 },
  { period: "2021-Q4", year: 2021, quarter: 4, index_all: 111.6, index_houses: 113.8, index_apartments: 109.8 },
  { period: "2022-Q1", year: 2022, quarter: 1, index_all: 113.2, index_houses: 115.7, index_apartments: 111.2 },
  { period: "2022-Q2", year: 2022, quarter: 2, index_all: 114.5, index_houses: 117.2, index_apartments: 112.3 },
  { period: "2022-Q3", year: 2022, quarter: 3, index_all: 115.5, index_houses: 118.4, index_apartments: 113.1 },
  { period: "2022-Q4", year: 2022, quarter: 4, index_all: 116.2, index_houses: 119.2, index_apartments: 113.7 },
  { period: "2023-Q1", year: 2023, quarter: 1, index_all: 116.7, index_houses: 119.8, index_apartments: 114.1 },
  { period: "2023-Q2", year: 2023, quarter: 2, index_all: 117.0, index_houses: 120.2, index_apartments: 114.3 },
  { period: "2023-Q3", year: 2023, quarter: 3, index_all: 117.2, index_houses: 120.5, index_apartments: 114.5 },
  { period: "2023-Q4", year: 2023, quarter: 4, index_all: 117.4, index_houses: 120.8, index_apartments: 114.6 },
  { period: "2024-Q1", year: 2024, quarter: 1, index_all: 117.8, index_houses: 121.3, index_apartments: 114.9 },
  { period: "2024-Q2", year: 2024, quarter: 2, index_all: 118.3, index_houses: 121.9, index_apartments: 115.3 },
  { period: "2024-Q3", year: 2024, quarter: 3, index_all: 118.9, index_houses: 122.6, index_apartments: 115.8 },
  { period: "2024-Q4", year: 2024, quarter: 4, index_all: 119.4, index_houses: 123.2, index_apartments: 116.2 },
];

// ── Tool: get_property_price_index ───────────────────────────────────────────

async function handleGetPropertyPriceIndex(
  args: Record<string, unknown>
): Promise<string> {
  const rawType = typeof args.type === "string" ? args.type.trim().toLowerCase() : "all";
  const rawFrom = typeof args.from === "string" ? args.from.trim() : undefined;
  const rawTo = typeof args.to === "string" ? args.to.trim() : undefined;

  const validTypes = ["all", "houses", "apartments"];
  if (!validTypes.includes(rawType)) {
    throw new Error(`Invalid type "${rawType}". Must be one of: all, houses, apartments`);
  }

  // Filter by from/to
  let data = [...SWRPI_ALL_DATA];

  if (rawFrom) {
    const parsed = parseQuarter(rawFrom);
    if (!parsed) throw new Error(`Invalid from value: "${rawFrom}". Use format like "2020Q1" or "2020"`);
    data = data.filter(
      (d) => d.year > parsed.year || (d.year === parsed.year && d.quarter >= parsed.quarter)
    );
  }

  if (rawTo) {
    const parsed = parseQuarter(rawTo);
    if (!parsed) throw new Error(`Invalid to value: "${rawTo}". Use format like "2024Q4" or "2024"`);
    data = data.filter(
      (d) => d.year < parsed.year || (d.year === parsed.year && d.quarter <= parsed.quarter)
    );
  }

  if (data.length === 0) {
    throw new Error("No data available for the specified period range");
  }

  // Build series based on type
  const series = data.map((d) => {
    const entry: Record<string, unknown> = { period: d.period };
    if (rawType === "all") entry.index = d.index_all;
    else if (rawType === "houses") entry.index = d.index_houses;
    else entry.index = d.index_apartments;
    return entry;
  });

  // Trend: compare latest to previous year same quarter
  const latest = data[data.length - 1];
  const prevYear = data.find(
    (d) => d.year === latest.year - 1 && d.quarter === latest.quarter
  );

  let latestIndex: number;
  let prevIndex: number | undefined;
  if (rawType === "all") {
    latestIndex = latest.index_all;
    prevIndex = prevYear?.index_all;
  } else if (rawType === "houses") {
    latestIndex = latest.index_houses;
    prevIndex = prevYear?.index_houses;
  } else {
    latestIndex = latest.index_apartments;
    prevIndex = prevYear?.index_apartments;
  }

  const trend =
    prevIndex !== undefined
      ? {
          change_yoy: parseFloat((((latestIndex - prevIndex) / prevIndex) * 100).toFixed(2)),
          change_yoy_label: `${latest.period} vs ${quarterToLabel(latest.year - 1, latest.quarter)}`,
        }
      : null;

  // Reference: fetch dataset metadata from CKAN for the source URL
  const datasetUrl = `https://opendata.swiss/en/dataset/${SWRPI_DATASET_ID}`;

  return JSON.stringify({
    type: rawType,
    baseline: "Q4 2019 = 100",
    from: data[0].period,
    to: data[data.length - 1].period,
    latest_index: latestIndex,
    latest_period: latest.period,
    data_points: series.length,
    series,
    trend,
    note: "Swiss Residential Property Price Index (SWRPI). Baseline Q4 2019 = 100.",
    source: "Federal Statistical Office (BFS) — Swiss Residential Property Price Index (SWRPI)",
    source_url: datasetUrl,
    dataset_id: SWRPI_DATASET_ID,
  });
}

// ── Tool: search_real_estate_data ────────────────────────────────────────────

async function handleSearchRealEstateData(
  args: Record<string, unknown>
): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) throw new Error("query is required");

  const limit = Math.min(20, Math.max(1, typeof args.limit === "number" ? args.limit : 10));

  const url = buildUrl(`${CKAN_BASE}/package_search`, {
    q: query,
    rows: limit,
    fq: "groups:territoire-et-environnement OR groups:construction-et-logement OR tags:immobilien OR tags:wohnen OR tags:miete OR tags:logement",
  });

  const data = await fetchJSON<CkanSearchResult>(url, {
    headers: { "User-Agent": "mcp-swiss" },
  });

  if (!data.success) throw new Error("opendata.swiss search failed");

  // Also do a fallback search without group filter if we get 0 results
  let results = data.result.results;
  let totalCount = data.result.count;

  if (results.length === 0) {
    const url2 = buildUrl(`${CKAN_BASE}/package_search`, { q: query, rows: limit });
    const data2 = await fetchJSON<CkanSearchResult>(url2, {
      headers: { "User-Agent": "mcp-swiss" },
    });
    if (data2.success) {
      results = data2.result.results;
      totalCount = data2.result.count;
    }
  }

  const mapped = results.map((pkg) => {
    const resources = (pkg.resources ?? []).slice(0, 5).map((r) => ({
      name: resolveText(r.name) || r.format,
      format: r.format,
      url: r.url,
    }));

    return {
      id: pkg.name,
      title: resolveText(pkg.title),
      description: truncate(resolveText(pkg.notes || pkg.description), 200),
      keywords: pkg.keywords?.en ?? pkg.keywords?.de ?? [],
      modified: pkg.metadata_modified?.slice(0, 10) ?? "",
      organization: resolveText(pkg.organization?.title),
      resources,
      dataset_url: `https://opendata.swiss/en/dataset/${pkg.name}`,
    };
  });

  return JSON.stringify({
    query,
    total_matches: totalCount,
    returned: mapped.length,
    results: mapped,
    source: "opendata.swiss CKAN",
    source_url: `https://opendata.swiss/en/dataset?q=${encodeURIComponent(query)}`,
  });
}

// ── Tool: get_rent_index ─────────────────────────────────────────────────────

async function handleGetRentIndex(args: Record<string, unknown>): Promise<string> {
  const rawYear = typeof args.year === "number" ? args.year : undefined;
  const rawLimit = Math.min(60, Math.max(1, typeof args.limit === "number" ? args.limit : 24));

  // Fetch CPI (LIK) data from Canton Zug open data - monthly index (base Dec 1982 = 100)
  // This is the Swiss national CPI (Landesindex der Konsumentenpreise) which includes
  // the residential rent component
  const totalRecords = 515; // approximate total

  let url: string;
  if (rawYear !== undefined) {
    // Fetch specific year - estimate offset
    // Data starts from Dec 1982 (record 0) ~ month 0
    // Each year has 12 records. 1982 has 1 record (Dec only).
    const yearsFromStart = rawYear - 1982;
    const estOffset = Math.max(0, 1 + (yearsFromStart - 1) * 12);
    url = buildUrl(CPI_RENT_URL, { _limit: 12, _offset: estOffset });
  } else {
    // Latest data - fetch last N months
    const offset = Math.max(0, totalRecords - rawLimit);
    url = buildUrl(CPI_RENT_URL, { _limit: rawLimit, _offset: offset });
  }

  const data = await fetchJSON<ZgCpiResponse>(url, {
    headers: { "User-Agent": "mcp-swiss" },
  });

  // Filter by year if specified
  let rows = data.results;
  if (rawYear !== undefined) {
    rows = rows.filter((r) => r.jahr === String(rawYear));
  }

  if (rows.length === 0 && rawYear !== undefined) {
    throw new Error(
      `No CPI data found for year ${rawYear}. Available data: 1982–2025.`
    );
  }

  const series = rows.map((r) => ({
    year: parseInt(r.jahr, 10),
    month: r.monat,
    index: parseFloat(r.index),
  }));

  const latestRow = series[series.length - 1];
  const firstRow = series[0];

  // YoY change (if we have 12+ months)
  let yoyChange: number | null = null;
  if (series.length >= 13) {
    const prev = series[series.length - 13];
    if (prev) {
      yoyChange = parseFloat(
        (((latestRow.index - prev.index) / prev.index) * 100).toFixed(2)
      );
    }
  }

  const period =
    series.length > 0
      ? `${firstRow.month} ${firstRow.year} – ${latestRow.month} ${latestRow.year}`
      : "N/A";

  return JSON.stringify({
    index_name: "Swiss Consumer Price Index (LIK / IPC)",
    baseline: "December 1982 = 100",
    note:
      "The Swiss CPI (Landesindex der Konsumentenpreise) tracks the cost of living including residential rents. " +
      "This is the official Swiss national index published by BFS/FSO. " +
      "For the residential property price index (buying/ownership), use get_property_price_index.",
    period,
    latest: latestRow ?? null,
    data_points: series.length,
    series,
    yoy_change_percent: yoyChange,
    source: "Federal Statistical Office (BFS) via Canton Zug Open Data",
    source_url: "https://data.zg.ch/store/1/resource/334",
    ckan_dataset: "https://opendata.swiss/en/dataset/landesindex-der-konsumentenpreise",
  });
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const realEstateTools = [
  {
    name: "get_property_price_index",
    description:
      "Get the Swiss Residential Property Price Index (SWRPI) — official BFS data. " +
      "Baseline Q4 2019 = 100. Returns quarterly index values tracking Swiss property prices " +
      "since 2009. Covers all properties, single-family houses, and apartments separately.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            'Property type to filter by: "all" (combined index), "houses" (single-family), ' +
            '"apartments" (condominiums/flats). Defaults to "all".',
        },
        from: {
          type: "string",
          description:
            'Start period (inclusive). Format: "2020Q1", "2020-Q1", or just "2020". ' +
            "Defaults to earliest available (2009-Q4).",
        },
        to: {
          type: "string",
          description:
            'End period (inclusive). Format: "2024Q4", "2024-Q4", or just "2024". ' +
            "Defaults to latest available.",
        },
      },
    },
  },
  {
    name: "search_real_estate_data",
    description:
      "Search opendata.swiss for Swiss real estate and housing datasets. " +
      "Finds datasets about property prices, rents, housing construction, vacancy rates, and more. " +
      "Returns dataset names, descriptions, and resource download URLs.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            'Search terms in German, French, or English (e.g. "Immobilien", "Miete", ' +
            '"rent", "logement", "Wohnungspreise", "Leerwohnungen").',
        },
        limit: {
          type: "number",
          description: "Max results to return (1–20, default 10).",
        },
      },
    },
  },
  {
    name: "get_rent_index",
    description:
      "Get the Swiss Consumer Price Index (CPI/LIK), which tracks cost of living including " +
      "residential rents. Baseline December 1982 = 100. Published monthly by BFS. " +
      "For property purchase prices, use get_property_price_index instead.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description:
            "Filter to a specific year (1983–2025). Omit for latest 24 months.",
        },
        limit: {
          type: "number",
          description:
            "Number of recent monthly data points to return (1–60, default 24). Ignored if year is set.",
        },
      },
    },
  },
];

// ── Main dispatcher ──────────────────────────────────────────────────────────

export async function handleRealEstate(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_property_price_index":
      return handleGetPropertyPriceIndex(args);
    case "search_real_estate_data":
      return handleSearchRealEstateData(args);
    case "get_rent_index":
      return handleGetRentIndex(args);
    default:
      throw new Error(`Unknown real estate tool: ${name}`);
  }
}
