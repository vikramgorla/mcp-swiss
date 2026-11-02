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

// ── SWRPI/IMPI series (BFS, fetched live) ────────────────────────────────────

// The BFS publishes the IMPI series as the JSON that feeds its own chart. The order
// number is stable across releases; the asset id behind it changes every quarter.
const IMPI_ORDER_NR = "ds-x-05.06.03.01.02";
const IMPI_ASSETS_URL = "https://dam-api.bfs.admin.ch/hub/api/dam/assets";
const IMPI_PAGE_URL =
  "https://www.bfs.admin.ch/bfs/en/home/statistics/prices/surveys/impi.html";

interface BfsAssetList {
  total: number;
  data: Array<{
    ids: { damId: number };
    bfs?: { lifecycle?: { code?: string } };
    links?: Array<{ rel?: string; href?: string; format?: string }>;
  }>;
}

/** Chart payload: one series per object type, one entry per geographic scope. */
interface ImpiJson {
  dataStatus: string;
  data: Record<string, Record<string, Array<{ year: string; value: number }>>>;
}

interface ImpiPoint {
  period: string;
  year: number;
  quarter: number;
  index_all: number;
  index_houses: number;
  index_apartments: number;
}

interface ImpiSeries {
  points: ImpiPoint[];
  /** "Data as of" date published with the series, e.g. "30.07.2026". */
  dataStatus: string;
  assetUrl: string;
}

let impiCache: ImpiSeries | null = null;
let impiPending: Promise<ImpiSeries> | null = null;

export function clearRealEstateCache(): void {
  impiCache = null;
  impiPending = null;
}

/** The chart labels quarters by their middle month: 2 → Q1, 5 → Q2, 8 → Q3, 11 → Q4. */
function monthLabelToQuarter(label: string): { year: number; quarter: number } | null {
  const m = label.match(/^(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const quarter = Math.floor((parseInt(m[1], 10) - 1) / 3) + 1;
  if (quarter < 1 || quarter > 4) return null;
  return { year: parseInt(m[2], 10), quarter };
}

async function fetchImpiSeries(): Promise<ImpiSeries> {
  const list = await fetchJSON<BfsAssetList>(
    buildUrl(IMPI_ASSETS_URL, { orderNr: IMPI_ORDER_NR }),
    { timeoutMs: 60_000 }
  );
  const asset =
    list.data?.find((a) => a.bfs?.lifecycle?.code === "CURRENT") ?? list.data?.[0];
  const href = asset?.links?.find((l) => l.rel === "master")?.href;
  if (!href) {
    throw new Error(
      `BFS published no current IMPI data file for ${IMPI_ORDER_NR}. See ${IMPI_PAGE_URL}`
    );
  }

  const raw = await fetchJSON<ImpiJson>(href, { timeoutMs: 60_000 });
  // geoscope1 is Switzerland as a whole; geoscope2–6 are the five municipality types.
  const all = raw.data?.total?.geoscope1;
  const houses = raw.data?.efh?.geoscope1;
  const apartments = raw.data?.egw?.geoscope1;
  if (!all?.length || houses?.length !== all.length || apartments?.length !== all.length) {
    throw new Error(`BFS IMPI data file has an unexpected shape — ${href}`);
  }

  const points: ImpiPoint[] = [];
  for (let i = 0; i < all.length; i++) {
    const q = monthLabelToQuarter(all[i].year);
    if (!q) continue;
    points.push({
      period: quarterToLabel(q.year, q.quarter),
      year: q.year,
      quarter: q.quarter,
      index_all: all[i].value,
      index_houses: houses[i]?.value,
      index_apartments: apartments[i]?.value,
    });
  }
  points.sort((a, b) => a.year - b.year || a.quarter - b.quarter);

  return { points, dataStatus: raw.dataStatus, assetUrl: href };
}

async function loadImpiSeries(): Promise<ImpiSeries> {
  if (impiCache) return impiCache;
  impiPending ??= fetchImpiSeries()
    .then((series) => {
      impiCache = series;
      return series;
    })
    .finally(() => {
      impiPending = null;
    });
  return impiPending;
}

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

  const impi = await loadImpiSeries();
  let data = [...impi.points];

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
    const first = impi.points[0];
    const last = impi.points[impi.points.length - 1];
    throw new Error(
      `No IMPI data for the requested range. The published series covers ${first.period}–${last.period}.`
    );
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
    scope: "Switzerland, all municipality types",
    data_as_of: impi.dataStatus,
    source: "Federal Statistical Office (BFS) — Swiss residential property price index (IMPI)",
    source_url: IMPI_PAGE_URL,
    data_url: impi.assetUrl,
    dataset_url: `https://opendata.swiss/en/dataset/${SWRPI_DATASET_ID}`,
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

  const data = await fetchJSON<CkanSearchResult>(url);

  if (!data.success) throw new Error("opendata.swiss search failed");

  // Also do a fallback search without group filter if we get 0 results
  let results = data.result.results;
  let totalCount = data.result.count;

  if (results.length === 0) {
    const url2 = buildUrl(`${CKAN_BASE}/package_search`, { q: query, rows: limit });
    const data2 = await fetchJSON<CkanSearchResult>(url2);
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

/** First and last row of the CPI series, plus the row count, all read from the store. */
async function fetchCpiExtent(): Promise<{ total: number; first: ZgCpiRow; last: ZgCpiRow }> {
  const head = await fetchJSON<ZgCpiResponse>(buildUrl(CPI_RENT_URL, { _limit: 1, _offset: 0 }));
  const first = head.results?.[0];
  if (!first) throw new Error("CPI series is empty at data.zg.ch");

  const total = head.resultCount ?? 1;
  if (total <= 1) return { total: 1, first, last: first };

  const tail = await fetchJSON<ZgCpiResponse>(
    buildUrl(CPI_RENT_URL, { _limit: 1, _offset: total - 1 })
  );
  return { total, first, last: tail.results?.[0] ?? first };
}

async function handleGetRentIndex(args: Record<string, unknown>): Promise<string> {
  const rawYear = typeof args.year === "number" ? args.year : undefined;
  const rawLimit = Math.min(60, Math.max(1, typeof args.limit === "number" ? args.limit : 24));

  // Swiss national CPI (Landesindex der Konsumentenpreise), monthly, from the Canton Zug
  // mirror. The store grows every month, so the row count and the covered period are read
  // from it rather than assumed.
  const extent = await fetchCpiExtent();
  const coverage = `${extent.first.monat} ${extent.first.jahr} – ${extent.last.monat} ${extent.last.jahr}`;

  let rows: ZgCpiRow[];
  if (rawYear !== undefined) {
    // The store filters on jahr server-side, so no offset arithmetic is needed.
    const data = await fetchJSON<ZgCpiResponse>(
      buildUrl(CPI_RENT_URL, { jahr: rawYear, _limit: 12 })
    );
    rows = data.results ?? [];
    if (rows.length === 0) {
      throw new Error(`No CPI data for year ${rawYear}. The series covers ${coverage}.`);
    }
  } else {
    const offset = Math.max(0, extent.total - rawLimit);
    const data = await fetchJSON<ZgCpiResponse>(
      buildUrl(CPI_RENT_URL, { _limit: rawLimit, _offset: offset })
    );
    rows = data.results ?? [];
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
    baseline: `${extent.first.monat} ${extent.first.jahr} = ${extent.first.index}`,
    coverage,
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
      "BFS residential property price index (IMPI), quarterly since 2017Q1, Q4 2019 = 100",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["all", "houses", "apartments"],
          default: "all",
        },
        from: {
          type: "string",
          description: "Inclusive, e.g. 2020Q1 or 2020 (default: earliest)",
        },
        to: {
          type: "string",
          description: "Inclusive, e.g. 2024Q4 or 2024 (default: latest)",
        },
      },
    },
  },
  {
    name: "search_real_estate_data",
    description:
      "Search opendata.swiss for real-estate/housing datasets (prices, rents, construction, vacancies)",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "DE/FR/EN terms, e.g. Miete, logement, Leerwohnungen",
        },
        limit: {
          type: "number",
          description: "1–20",
          default: 10,
        },
      },
    },
  },
  {
    name: "get_rent_index",
    description:
      "BFS consumer price index (CPI/LIK, incl. rents), monthly, Dec 1982 = 100. Not a dedicated rent index; for purchase prices use get_property_price_index",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "1982 onward (omit for recent months)",
        },
        limit: {
          type: "number",
          description: "Recent months, 1–60; ignored if year set",
          default: 24,
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
