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

// German, French, Italian and English names → canton code. Keys are compared
// after foldAccents(), so plain ASCII spellings here match "Zürich", "Genève"…
const CANTON_ALIASES: Record<string, string> = {
  zurich: "ZH", zurigo: "ZH",
  bern: "BE", berne: "BE", berna: "BE",
  luzern: "LU", lucerne: "LU", lucerna: "LU",
  uri: "UR",
  schwyz: "SZ", schwytz: "SZ", svitto: "SZ",
  obwalden: "OW", obwald: "OW", obvaldo: "OW",
  nidwalden: "NW", nidwald: "NW", nidvaldo: "NW",
  glarus: "GL", glaris: "GL", glarona: "GL",
  zug: "ZG", zoug: "ZG", zugo: "ZG",
  fribourg: "FR", freiburg: "FR", friburgo: "FR",
  solothurn: "SO", soleure: "SO", soletta: "SO",
  "basel-stadt": "BS", "basel-city": "BS", "basle-city": "BS", "bale-ville": "BS",
  "basilea-citta": "BS", basel: "BS", bale: "BS",
  "basel-landschaft": "BL", "basel-country": "BL", "basel-land": "BL", baselland: "BL",
  "bale-campagne": "BL", "basilea-campagna": "BL",
  schaffhausen: "SH", schaffhouse: "SH", sciaffusa: "SH",
  appenzell: "AR", "appenzell ausserrhoden": "AR", "appenzell outer rhodes": "AR",
  "appenzell rhodes-exterieures": "AR", "appenzello esterno": "AR",
  "appenzell innerrhoden": "AI", "appenzell inner rhodes": "AI",
  "appenzell rhodes-interieures": "AI", "appenzello interno": "AI",
  "st. gallen": "SG", "st gallen": "SG", "saint gallen": "SG", "sankt gallen": "SG",
  "saint-gall": "SG", "san gallo": "SG",
  graubunden: "GR", grisons: "GR", grigioni: "GR",
  aargau: "AG", argovie: "AG", argovia: "AG",
  thurgau: "TG", thurgovie: "TG", turgovia: "TG",
  ticino: "TI", tessin: "TI",
  vaud: "VD", waadt: "VD",
  valais: "VS", wallis: "VS", vallese: "VS",
  neuchatel: "NE", neuenburg: "NE", neuchatelois: "NE",
  geneva: "GE", geneve: "GE", genf: "GE", ginevra: "GE",
  jura: "JU", giura: "JU",
};

const ALL_CANTON_CODES = Object.values(CANTON_CODES);
const POPULATION_YEAR_VARIABLE = "Jahr";

// ── API types ────────────────────────────────────────────────────────────────

interface PxWebMetadata {
  title: string;
  variables: Array<{ code: string; text: string; values: string[]; valueTexts: string[] }>;
}

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

/**
 * Lowercase, strip diacritics and flatten separators, so "Genève",
 * "Bâle-Ville" and "St.Gallen" become "geneve", "bale ville", "st gallen".
 */
function foldAccents(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_/.,-]+/g, " ")
    .trim();
}

/** Canton codes and official names in all four languages, folded to ASCII. */
const CANTON_LOOKUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [key, code] of Object.entries(CANTON_CODES)) map[key] = code;
  for (const [code, name] of Object.entries(CANTON_NAMES)) map[foldAccents(name)] = code;
  for (const [alias, code] of Object.entries(CANTON_ALIASES)) map[foldAccents(alias)] = code;
  return map;
})();

function resolveCantonCode(input: string): string | null {
  const normalized = foldAccents(input);
  if (CANTON_LOOKUP[normalized]) return CANTON_LOOKUP[normalized];
  // "canton de Genève", "Kanton Zürich" and the like
  if (normalized.length >= 4) {
    for (const [name, code] of Object.entries(CANTON_LOOKUP)) {
      if (name.length >= 4 && (name.includes(normalized) || normalized.includes(name))) return code;
    }
  }
  return null;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

const POPULATION_URL = `${PXWEB_BASE}/${POPULATION_TABLE}/${POPULATION_TABLE}.px`;
const YEARS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let _yearsCache: string[] | null = null;
let _yearsCachedAt = 0;

/** Clear the cached STATPOP year list (for testing) */
export function clearStatisticsCache(): void {
  _yearsCache = null;
  _yearsCachedAt = 0;
}

/**
 * Years the STATPOP cube actually carries, read from its own metadata so the
 * module does not go stale when BFS publishes a new vintage.
 */
async function populationYears(): Promise<string[]> {
  if (_yearsCache && Date.now() - _yearsCachedAt < YEARS_CACHE_TTL_MS) return _yearsCache;

  const meta = await fetchJSON<PxWebMetadata>(POPULATION_URL, { timeoutMs: 120_000 });
  const years = meta.variables
    ?.find((v) => v.code === POPULATION_YEAR_VARIABLE)
    ?.values.slice()
    .sort();
  if (!years?.length) throw new Error("BFS returned no year list for the STATPOP table");

  _yearsCache = years;
  _yearsCachedAt = Date.now();
  return years;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const statisticsTools = [
  {
    name: "get_population",
    description:
      "Permanent resident population (BFS STATPOP) for Switzerland, a canton or all cantons",
    inputSchema: {
      type: "object",
      properties: {
        canton: {
          type: "string",
          description:
            "Canton code or name (e.g. ZH, Geneva); 'all' for every canton; omit for national total",
        },
        year: {
          type: "number",
          description: "STATPOP year, from 2010; default is the latest published",
        },
      },
    },
  },
  {
    name: "search_statistics",
    description:
      "Search BFS datasets on opendata.swiss",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "e.g. unemployment, GDP",
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
    name: "get_statistic",
    description:
      "Details and resource links for a BFS dataset by opendata.swiss ID (from search_statistics)",
    inputSchema: {
      type: "object",
      required: ["dataset_id"],
      properties: {
        dataset_id: {
          type: "string",
          description: "e.g. bevolkerungsstatistik-einwohner",
        },
      },
    },
  },
];

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleGetPopulation(args: Record<string, unknown>): Promise<string> {
  const rawCanton = typeof args.canton === "string" ? args.canton.trim() : "";

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

  const availableYears = await populationYears();
  const latestYear = availableYears[availableYears.length - 1];
  const year = args.year !== undefined ? String(args.year) : latestYear;

  if (!availableYears.includes(year)) {
    throw new Error(`Year must be between ${availableYears[0]} and ${latestYear}. Got: ${year}`);
  }

  const url = POPULATION_URL;

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

  // BFS PxWeb can take >60 s on a cold cache (then answers in ~0.1 s)
  const data = await fetchJSON<PxWebResponse>(url, {
    timeoutMs: 120_000,
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
      /* c8 ignore next */
      location: CANTON_NAMES[code] ?? code, // defensive: code always in CANTON_NAMES
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
