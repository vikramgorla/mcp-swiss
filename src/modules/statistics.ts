import { fetchJSON, buildUrl } from "../utils/http.js";

const PXWEB_BASE = "https://www.pxweb.bfs.admin.ch/api/v1/en";
const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";
const POPULATION_TABLE = "px-x-0102010000_101";
const BFS_ORG = "bundesamt-fur-statistik-bfs";

// ── Canton lookup ────────────────────────────────────────────────────────────

const CANTON_CODES: Record<string, string> = {
  zh: "ZH", be: "BE", lu: "LU", ur: "UR", sz: "SZ",
  ow: "OW", nw: "NW", gl: "GL", zg: "ZG", fr: "FR",
  so: "SO", bs: "BS", bl: "BL", sh: "SH", ar: "AR",
  ai: "AI", sg: "SG", gr: "GR", ag: "AG", tg: "TG",
  ti: "TI", vd: "VD", vs: "VS", ne: "NE", ge: "GE",
  ju: "JU",
};

const CANTON_NAMES: Record<string, string> = {
  ZH: "Zürich", BE: "Bern", LU: "Luzern", UR: "Uri", SZ: "Schwyz",
  OW: "Obwalden", NW: "Nidwalden", GL: "Glarus", ZG: "Zug",
  FR: "Fribourg", SO: "Solothurn", BS: "Basel-Stadt",
  BL: "Basel-Landschaft", SH: "Schaffhausen", AR: "Appenzell Ausserrhoden",
  AI: "Appenzell Innerrhoden", SG: "St. Gallen", GR: "Graubünden",
  AG: "Aargau", TG: "Thurgau", TI: "Ticino", VD: "Vaud",
  VS: "Valais", NE: "Neuchâtel", GE: "Genève", JU: "Jura",
};

// Alternative name lookup (common English/German/French names → canton code)
const CANTON_ALIASES: Record<string, string> = {
  zurich: "ZH", bern: "BE", berne: "BE", lucerne: "LU", luzern: "LU",
  uri: "UR", schwyz: "SZ", obwalden: "OW", nidwalden: "NW",
  glarus: "GL", zug: "ZG", fribourg: "FR", freiburg: "FR",
  solothurn: "SO", "basel-stadt": "BS", "basel-city": "BS",
  "basel-landschaft": "BL", "basel-country": "BL",
  schaffhausen: "SH", appenzell: "AR",
  "st. gallen": "SG", "saint gallen": "SG", "st gallen": "SG",
  graubunden: "GR", grisons: "GR", aargau: "AG", argovia: "AG",
  thurgau: "TG", ticino: "TI", tessin: "TI", vaud: "VD",
  valais: "VS", wallis: "VS", neuchatel: "NE", geneva: "GE",
  genf: "GE", geneve: "GE", jura: "JU",
};

const ALL_CANTON_CODES = Object.values(CANTON_CODES);
const LATEST_YEAR = "2024";
const AVAILABLE_YEARS = ["2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"];

// ── API types ────────────────────────────────────────────────────────────────

interface PxWebResponse {
  columns: Array<{ code: string; text: string; type: string }>;
  comments: unknown[];
  data: Array<{ key: string[]; values: string[] }>;
  metadata: unknown[];
}

interface CkanResource {
  name: string | Record<string, string>;
  format: string;
  url: string;
  description?: string | Record<string, string>;
}

interface CkanPackage {
  id: string;
  name: string;
  title: string | Record<string, string>;
  description?: string | Record<string, string>;
  notes?: string | Record<string, string>;
  keywords?: Record<string, string[]>;
  resources?: CkanResource[];
  issued?: string;
  metadata_modified?: string;
  contact_points?: Array<{ name: string; email: string }>;
  organization?: { title: string | Record<string, string> };
}

interface CkanSearchResult {
  success: boolean;
  result: {
    count: number;
    results: CkanPackage[];
  };
}

interface CkanPackageResult {
  success: boolean;
  result: CkanPackage;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveText(val: string | Record<string, string> | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en || val.de || val.fr || val.it || Object.values(val)[0] || "";
}

function resolveCantonCode(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  // Direct 2-letter code
  if (CANTON_CODES[normalized]) return CANTON_CODES[normalized];
  // Already uppercase code
  if (CANTON_NAMES[input.toUpperCase()]) return input.toUpperCase();
  // Alias lookup
  if (CANTON_ALIASES[normalized]) return CANTON_ALIASES[normalized];
  // Partial match
  for (const [alias, code] of Object.entries(CANTON_ALIASES)) {
    if (alias.includes(normalized) || normalized.includes(alias)) return code;
  }
  return null;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const statisticsTools = [
  {
    name: "get_population",
    description:
      "Get Swiss population data from the Federal Statistical Office (FSO/BFS). " +
      "Returns population figures for Switzerland, a canton, or all cantons. " +
      "Data source: BFS STATPOP (permanent resident population).",
    inputSchema: {
      type: "object",
      properties: {
        canton: {
          type: "string",
          description:
            "Canton name or 2-letter code (e.g. 'ZH', 'Zürich', 'Geneva', 'BE'). " +
            "Omit to get Switzerland total. Use 'all' to list all cantons.",
        },
        year: {
          type: "number",
          description: `Year of data (${AVAILABLE_YEARS[0]}–${LATEST_YEAR}). Defaults to latest (${LATEST_YEAR}).`,
        },
      },
    },
  },
  {
    name: "search_statistics",
    description:
      "Search Swiss Federal Statistical Office (BFS/OFS/UST) datasets on opendata.swiss. " +
      "Returns matching dataset titles, IDs, and descriptions.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g. 'unemployment', 'GDP', 'housing prices', 'birth rate')",
        },
        limit: {
          type: "number",
          description: "Max results to return (1–20, default 10)",
        },
      },
    },
  },
  {
    name: "get_statistic",
    description:
      "Fetch details and resource links for a specific BFS/OFS dataset by its opendata.swiss identifier. " +
      "Use search_statistics first to find dataset IDs.",
    inputSchema: {
      type: "object",
      required: ["dataset_id"],
      properties: {
        dataset_id: {
          type: "string",
          description: "Dataset identifier from opendata.swiss (e.g. 'bevolkerungsstatistik-einwohner')",
        },
      },
    },
  },
];

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleGetPopulation(args: Record<string, unknown>): Promise<string> {
  const rawCanton = typeof args.canton === "string" ? args.canton.trim() : "";
  const rawYear = args.year;
  const year = rawYear !== undefined ? String(rawYear) : LATEST_YEAR;

  if (!AVAILABLE_YEARS.includes(year)) {
    throw new Error(`Year must be between ${AVAILABLE_YEARS[0]} and ${LATEST_YEAR}. Got: ${year}`);
  }

  const url = `${PXWEB_BASE}/${POPULATION_TABLE}/${POPULATION_TABLE}.px`;

  // Determine which locations to query
  let locationCodes: string[];
  let mode: "switzerland" | "canton" | "all";

  if (!rawCanton || rawCanton.toLowerCase() === "switzerland" || rawCanton === "8100") {
    locationCodes = ["8100"];
    mode = "switzerland";
  } else if (rawCanton.toLowerCase() === "all") {
    locationCodes = ["8100", ...ALL_CANTON_CODES];
    mode = "all";
  } else {
    const code = resolveCantonCode(rawCanton);
    if (!code) {
      throw new Error(
        `Unknown canton: "${rawCanton}". Use a 2-letter code (ZH, BE, GE…) or canton name. ` +
        `Or use "all" to list all cantons.`
      );
    }
    locationCodes = [code];
    mode = "canton";
  }

  const body = {
    query: [
      { code: "Jahr", selection: { filter: "item", values: [year] } },
      {
        code: "Kanton (-) / Bezirk (>>) / Gemeinde (......)",
        selection: { filter: "item", values: locationCodes },
      },
      { code: "Bevölkerungstyp", selection: { filter: "item", values: ["1"] } },
      { code: "Staatsangehörigkeit (Kategorie)", selection: { filter: "item", values: ["-99999"] } },
      { code: "Geschlecht", selection: { filter: "item", values: ["-99999"] } },
      { code: "Alter", selection: { filter: "item", values: ["-99999"] } },
    ],
    response: { format: "json" },
  };

  const data = await fetchJSON<PxWebResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (mode === "switzerland") {
    const row = data.data[0];
    const pop = row ? parseInt(row.values[0], 10) : null;
    return JSON.stringify({
      location: "Switzerland",
      year: parseInt(year, 10),
      population: pop,
      population_type: "Permanent resident population",
      source: "Federal Statistical Office (FSO/BFS) — STATPOP",
      source_url: "https://www.bfs.admin.ch/bfs/en/home/statistics/population.html",
    });
  }

  if (mode === "canton") {
    const code = locationCodes[0];
    const row = data.data[0];
    const pop = row ? parseInt(row.values[0], 10) : null;
    return JSON.stringify({
      location: CANTON_NAMES[code] ?? code,
      canton_code: code,
      year: parseInt(year, 10),
      population: pop,
      population_type: "Permanent resident population",
      source: "Federal Statistical Office (FSO/BFS) — STATPOP",
      source_url: "https://www.bfs.admin.ch/bfs/en/home/statistics/population.html",
    });
  }

  // mode === "all"
  // Build a code→name map from the response keys
  const cantons: Array<{ canton: string; code: string; population: number }> = [];
  let switzerland: number | null = null;

  for (const row of data.data) {
    const locCode = row.key[1]; // year, location, poptype, citizenship, sex, age
    const pop = parseInt(row.values[0], 10);
    if (locCode === "8100") {
      switzerland = pop;
    } else {
      cantons.push({
        canton: CANTON_NAMES[locCode] ?? locCode,
        code: locCode,
        population: pop,
      });
    }
  }

  // Sort by population descending
  cantons.sort((a, b) => b.population - a.population);

  return JSON.stringify({
    year: parseInt(year, 10),
    switzerland_total: switzerland,
    cantons,
    population_type: "Permanent resident population",
    source: "Federal Statistical Office (FSO/BFS) — STATPOP",
    source_url: "https://www.bfs.admin.ch/bfs/en/home/statistics/population.html",
  });
}

async function handleSearchStatistics(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) throw new Error("query is required");

  const limit = Math.min(20, Math.max(1, typeof args.limit === "number" ? args.limit : 10));

  const url = buildUrl(`${CKAN_BASE}/package_search`, {
    q: query,
    rows: limit,
    fq: `organization:${BFS_ORG}`,
  });

  const data = await fetchJSON<CkanSearchResult>(url);

  if (!data.success) throw new Error("opendata.swiss search failed");

  const results = data.result.results.map((pkg) => ({
    id: pkg.name,
    title: resolveText(pkg.title),
    description: truncate(resolveText(pkg.notes || pkg.description), 200),
    keywords: pkg.keywords?.en ?? pkg.keywords?.de ?? [],
    modified: pkg.metadata_modified?.slice(0, 10) ?? "",
  }));

  return JSON.stringify({
    query,
    total_matches: data.result.count,
    returned: results.length,
    results,
    source: "opendata.swiss — Federal Statistical Office (BFS/OFS)",
    source_url: `https://opendata.swiss/en/organization/bundesamt-fur-statistik-bfs`,
  });
}

async function handleGetStatistic(args: Record<string, unknown>): Promise<string> {
  const datasetId = typeof args.dataset_id === "string" ? args.dataset_id.trim() : "";
  if (!datasetId) throw new Error("dataset_id is required");

  const url = buildUrl(`${CKAN_BASE}/package_show`, { id: datasetId });
  const data = await fetchJSON<CkanPackageResult>(url);

  if (!data.success) throw new Error(`Dataset not found: ${datasetId}`);

  const pkg = data.result;

  const resources = (pkg.resources ?? []).slice(0, 10).map((r) => ({
    name: resolveText(r.name),
    format: r.format,
    url: r.url,
  }));

  const contact = pkg.contact_points?.[0];
  const org = resolveText(pkg.organization?.title);

  return JSON.stringify({
    id: pkg.name,
    title: resolveText(pkg.title),
    description: truncate(resolveText(pkg.notes || pkg.description), 500),
    keywords: pkg.keywords?.en ?? pkg.keywords?.de ?? [],
    issued: pkg.issued?.slice(0, 10) ?? "",
    modified: pkg.metadata_modified?.slice(0, 10) ?? "",
    organization: org,
    contact: contact ? { name: contact.name, email: contact.email } : undefined,
    resources,
    source: "opendata.swiss",
    source_url: `https://opendata.swiss/en/dataset/${pkg.name}`,
  });
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleStatistics(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_population":
      return handleGetPopulation(args);
    case "search_statistics":
      return handleSearchStatistics(args);
    case "get_statistic":
      return handleGetStatistic(args);
    default:
      throw new Error(`Unknown statistics tool: ${name}`);
  }
}
