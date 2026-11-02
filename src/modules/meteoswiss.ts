/**
 * MeteoSwiss Open Government Data module
 *
 * Data source: MeteoSwiss OGD published as STAC collections on data.geo.admin.ch.
 * Station lists and measurements are CSV assets linked from the collection and items.
 * No API key.
 *
 * Provides:
 *   - list_ogd_stations: stations in one ogd-* collection
 *   - get_ogd_recent: latest measurements from the now/recent CSV
 *   - get_ogd_history: measurements for a date range from historical or recent CSVs
 */

import { fetchJSON } from "../utils/http.js";

const STAC_BASE = "https://data.geo.admin.ch/api/stac/v1";
const SOURCE = "MeteoSwiss Open Government Data";

type Granularity = "t" | "h" | "d" | "m" | "y";

interface CollectionInfo {
  id: string;
  title: string;
}

interface StacAsset {
  href?: string;
  type?: string;
}

interface StacCollection {
  id?: string;
  title?: string;
  assets?: Record<string, StacAsset>;
}

interface StacItem {
  id?: string;
  properties?: { title?: string };
  assets?: Record<string, StacAsset>;
}

interface NamedAsset {
  name: string;
  href: string;
}

const COLLECTIONS: Record<string, CollectionInfo> = {
  smn: {
    id: "ch.meteoschweiz.ogd-smn",
    title: "Automatic weather stations",
  },
  "smn-precip": {
    id: "ch.meteoschweiz.ogd-smn-precip",
    title: "Automatic precipitation stations",
  },
  "smn-tower": {
    id: "ch.meteoschweiz.ogd-smn-tower",
    title: "Automatic tower stations",
  },
  nime: {
    id: "ch.meteoschweiz.ogd-nime",
    title: "Manual precipitation stations",
  },
  nbcn: {
    id: "ch.meteoschweiz.ogd-nbcn",
    title: "Climate stations (homogeneous series)",
  },
  "nbcn-precip": {
    id: "ch.meteoschweiz.ogd-nbcn-precip",
    title: "Climate precipitation stations",
  },
  obs: {
    id: "ch.meteoschweiz.ogd-obs",
    title: "Meteorological visual observations",
  },
  phenology: {
    id: "ch.meteoschweiz.ogd-phenology",
    title: "Phenological observations",
  },
  tot: {
    id: "ch.meteoschweiz.ogd-tot",
    title: "Totaliser precipitation stations",
  },
};

const COLLECTION_HELP = Object.keys(COLLECTIONS).join(", ");

const GRANULARITY_ALIASES: Record<string, Granularity> = {
  t: "t",
  "10min": "t",
  "10m": "t",
  tenmin: "t",
  h: "h",
  hour: "h",
  hourly: "h",
  d: "d",
  day: "d",
  daily: "d",
  m: "m",
  month: "m",
  monthly: "m",
  y: "y",
  year: "y",
  yearly: "y",
};

const GRANULARITY_LABEL: Record<Granularity, string> = {
  t: "10-minute",
  h: "hourly",
  d: "daily",
  m: "monthly",
  y: "yearly",
};

const MAX_SPAN_DAYS: Record<Granularity, number> = {
  t: 2,
  h: 14,
  d: 366,
  m: 3660,
  y: 20000,
};

const KEY_ROOTS = ["tre200", "ure200", "rre150", "fkl010", "dkl010", "pp0qff", "sre000", "gre000"];

// ── Tool definitions ─────────────────────────────────────────────────────────

const collectionProperty = {
  type: "string",
  description:
    "OGD collection alias (default smn). Aliases: smn, smn-precip, smn-tower, nime, nbcn, nbcn-precip, obs, phenology, tot. A full STAC id such as ch.meteoschweiz.ogd-smn is also accepted.",
};

export const meteoswissTools = [
  {
    name: "list_ogd_stations",
    description:
      "List MeteoSwiss Open Government Data stations from a STAC collection on data.geo.admin.ch. " +
      "Defaults to SwissMetNet automatic weather stations (smn). Other station collections: " +
      "smn-precip, smn-tower, nime, nbcn, nbcn-precip, obs, phenology, tot. " +
      "Filter by canton or a name/code search.",
    inputSchema: {
      type: "object",
      properties: {
        collection: collectionProperty,
        canton: {
          type: "string",
          description: "Canton abbreviation (e.g. BE, ZH, VS, TI).",
        },
        query: {
          type: "string",
          description: "Case-insensitive match on station code or name (e.g. BER, Zürich).",
        },
        limit: {
          type: "number",
          description: "Maximum stations to return (default 30, max 150).",
        },
      },
    },
  },
  {
    name: "get_ogd_recent",
    description:
      "Get the latest MeteoSwiss OGD measurements for one station by reading the STAC CSV asset " +
      "(10-minute/hourly 'now' file when available, otherwise the recent file). " +
      "Times are Swiss local time. Use list_ogd_stations for codes such as BER, SMA, LUG.",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: {
          type: "string",
          description: "Station abbreviation (e.g. BER, SMA, LUG, BAS).",
        },
        collection: collectionProperty,
        granularity: {
          type: "string",
          description: "Resolution: t (10-minute), h (hourly, default), d (daily), m (monthly), y (yearly).",
        },
        parameters: {
          type: "string",
          description:
            "Comma-separated parameter codes (e.g. tre200h0,rre150h0). Omit for the common temperature, humidity, precipitation, wind, pressure, sunshine, and radiation columns. Use 'all' for the first data columns.",
        },
        limit: {
          type: "number",
          description: "Number of most recent rows (default 24, max 168).",
        },
      },
    },
  },
  {
    name: "get_ogd_history",
    description:
      "Get historical MeteoSwiss OGD measurements for one station and date range by parsing the STAC CSV assets. " +
      "Daily data defaults to the smaller recent/historical files. Hourly history is limited to 14 days because decade files are large. " +
      "Times are Swiss local time (no offset).",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: {
          type: "string",
          description: "Station abbreviation (e.g. BER).",
        },
        collection: collectionProperty,
        granularity: {
          type: "string",
          description: "Resolution: t, h, d (daily, default), m, or y.",
        },
        start_date: {
          type: "string",
          description: "First day YYYY-MM-DD (inclusive).",
        },
        end_date: {
          type: "string",
          description: "Last day YYYY-MM-DD (inclusive).",
        },
        parameters: {
          type: "string",
          description: "Comma-separated parameter codes, or omit for the common meteorological columns.",
        },
        limit: {
          type: "number",
          description: "Maximum rows (default 31, max 100). When truncated, the latest rows in the range are kept.",
        },
      },
    },
  },
];

// ── Small helpers ────────────────────────────────────────────────────────────

function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

function resolveCollection(value: unknown): { alias: string } & CollectionInfo {
  const raw = typeof value === "string" && value.trim() ? value.trim() : "smn";
  const alias = raw.toLowerCase();
  const known = COLLECTIONS[alias];
  if (known) return { alias, ...known };
  const byId = Object.entries(COLLECTIONS).find(([, info]) => info.id === raw);
  if (byId) return { alias: byId[0], ...byId[1] };
  throw new Error(`Unknown MeteoSwiss collection '${raw}'. Use one of: ${COLLECTION_HELP}`);
}

function requireStation(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("station is required");
  const code = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/.test(code)) {
    throw new Error("station must be a MeteoSwiss station code such as BER or SMA");
  }
  return code;
}

function resolveGranularity(value: unknown, fallback: Granularity): Granularity {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const gran = GRANULARITY_ALIASES[value.trim().toLowerCase()];
  if (!gran) {
    throw new Error("granularity must be t (10-minute), h (hourly), d (daily), m (monthly), or y (yearly)");
  }
  return gran;
}

function parseIsoDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  return value;
}

function requestedParameters(value: unknown): string[] | "all" | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.trim().toLowerCase() === "all") return "all";
  const codes = value.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
  return codes.length ? codes : null;
}

function currentYear(): number {
  return new Date().getUTCFullYear();
}

function assetsOf(assets: Record<string, StacAsset> | undefined): NamedAsset[] {
  if (!assets) return [];
  const list: NamedAsset[] = [];
  for (const [name, asset] of Object.entries(assets)) {
    if (typeof asset?.href === "string" && asset.href) list.push({ name, href: asset.href });
  }
  return list;
}

function findAsset(assets: NamedAsset[], pattern: RegExp): NamedAsset | undefined {
  return assets.find((asset) => pattern.test(asset.name));
}

async function fetchCsv(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "User-Agent": "mcp-swiss/0.8.3-dev",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
  }
  // MeteoSwiss CSV assets are ISO-8859-1. fetch().text() would decode them as UTF-8.
  const bytes = new Uint8Array(await response.arrayBuffer());
  return Buffer.from(bytes).toString("latin1");
}

function parseSemicolonCsv(text: string): Record<string, string>[] {
  const table = parseCsvTable(text);
  if (table.length < 2) return [];
  const headers = table[0].map((header) => header.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((cell) => cell.trim() === "")) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      row[headers[j]] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function parseMeteoTime(raw: string): { iso: string; day: string } | null {
  const match = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const day = `${match[3]}-${match[2]}-${match[1]}`;
  const iso = `${day}T${match[4] ?? "00"}:${match[5] ?? "00"}:00`;
  return { iso, day };
}

function parseMeasurement(raw: string): number | null {
  if (!raw || raw === "-" || raw.toLowerCase() === "na") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function timestampHeader(headers: string[]): string {
  return headers.find((header) => header === "reference_timestamp")
    ?? headers.find((header) => /timestamp|date|datum/i.test(header))
    ?? "reference_timestamp";
}

function chooseColumns(headers: string[], timeHeader: string, requested: string[] | "all" | null, gran: Granularity): string[] {
  const dataColumns = headers.filter((header) => header !== "station_abbr" && header !== timeHeader);
  if (requested === "all") return dataColumns.slice(0, 8);
  if (requested) {
    const wanted = new Set(requested);
    const picked = dataColumns.filter((header) => wanted.has(header.toLowerCase()));
    if (picked.length === 0) {
      throw new Error(
        `None of the requested parameters are in this file. Available: ${dataColumns.slice(0, 25).join(", ")}`
      );
    }
    return picked.slice(0, 12);
  }
  const preferred: string[] = [];
  for (const root of KEY_ROOTS) {
    const matches = dataColumns.filter((header) => header.toLowerCase().startsWith(root));
    const exact = matches.find((header) => header.toLowerCase() === `${root}${gran}0`);
    const chosen = exact ?? matches.slice().sort((a, b) => a.length - b.length)[0];
    if (chosen) preferred.push(chosen);
  }
  if (preferred.length > 0) return preferred;
  return dataColumns.slice(0, 8);
}

interface MeasurementRow {
  time: string;
  day: string;
  values: Record<string, number>;
}

function rowsToMeasurements(records: Record<string, string>[], columns: string[], timeHeader: string): MeasurementRow[] {
  const measurements: MeasurementRow[] = [];
  for (const record of records) {
    const stamp = parseMeteoTime(record[timeHeader] ?? "");
    if (!stamp) continue;
    const values: Record<string, number> = {};
    for (const column of columns) {
      const value = parseMeasurement(record[column] ?? "");
      if (value !== null) values[column] = value;
    }
    measurements.push({ time: stamp.iso, day: stamp.day, values });
  }
  measurements.sort((a, b) => a.time.localeCompare(b.time));
  return measurements;
}

function parameterLegend(records: Record<string, string>[], columns: string[]): Record<string, { description: string; unit: string }> {
  const byCode = new Map<string, Record<string, string>>();
  for (const record of records) {
    const code = (record.parameter_shortname || "").toLowerCase();
    if (code) byCode.set(code, record);
  }
  const legend: Record<string, { description: string; unit: string }> = {};
  for (const column of columns) {
    const record = byCode.get(column.toLowerCase());
    if (!record) continue;
    const description = record.parameter_description_en || record.parameter_description_de || column;
    const unit = record.parameter_unit || "";
    legend[column] = { description, unit };
  }
  return legend;
}

async function loadCollection(info: CollectionInfo): Promise<StacCollection> {
  return fetchJSON<StacCollection>(`${STAC_BASE}/collections/${encodeURIComponent(info.id)}`);
}

async function loadItem(info: CollectionInfo, station: string): Promise<StacItem> {
  const url = `${STAC_BASE}/collections/${encodeURIComponent(info.id)}/items/${encodeURIComponent(station.toLowerCase())}`;
  try {
    return await fetchJSON<StacItem>(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("HTTP 404")) {
      throw new Error(`Station not found: ${station.toUpperCase()} in ${info.id}`, { cause: error });
    }
    throw error;
  }
}

function metaAsset(collection: StacCollection, kind: "stations" | "parameters"): NamedAsset | undefined {
  return findAsset(assetsOf(collection.assets), new RegExp(`meta_${kind}\\.csv$`, "i"));
}

function pickRecentAsset(assets: NamedAsset[], gran: Granularity): NamedAsset {
  const now = findAsset(assets, new RegExp(`_${gran}_now\\.csv$`, "i"));
  const recent = findAsset(assets, new RegExp(`_${gran}_recent\\.csv$`, "i"));
  const plain = findAsset(assets, new RegExp(`_${gran}\\.csv$`, "i"));
  const chosen = now ?? recent ?? plain;
  if (!chosen) {
    const available = assets.map((asset) => asset.name).slice(0, 12).join(", ");
    throw new Error(`No ${GRANULARITY_LABEL[gran]} recent file for this station. Available assets: ${available}`);
  }
  return chosen;
}

function pickHistoryAssets(assets: NamedAsset[], gran: Granularity, startDate: string, endDate: string): NamedAsset[] {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  const year = currentYear();
  const selected: NamedAsset[] = [];

  if (gran === "m" || gran === "y") {
    const plain = findAsset(assets, new RegExp(`_${gran}\\.csv$`, "i"));
    const historical = findAsset(assets, new RegExp(`_${gran}_historical\\.csv$`, "i"));
    const chosen = plain ?? historical;
    if (chosen) return [chosen];
  }

  const decades = assets
    .map((asset) => {
      const match = asset.name.match(new RegExp(`_${gran}_historical_(\\d{4})-(\\d{4})\\.csv$`, "i"));
      if (!match) return null;
      return { asset, from: Number(match[1]), to: Number(match[2]) };
    })
    .filter((entry): entry is { asset: NamedAsset; from: number; to: number } => entry !== null)
    .filter((entry) => endYear >= entry.from && startYear <= entry.to)
    .sort((a, b) => a.from - b.from);

  const recent = findAsset(assets, new RegExp(`_${gran}_recent\\.csv$`, "i"));
  const fullHistory = findAsset(assets, new RegExp(`_${gran}_historical\\.csv$`, "i"));
  const needsRecent = endYear >= year && recent !== undefined;
  const needsArchive = startYear < year;

  if (decades.length > 0 && needsArchive) {
    for (const decade of decades) {
      if (decade.to < year || startYear <= decade.to) selected.push(decade.asset);
    }
  } else if (needsArchive && fullHistory) {
    selected.push(fullHistory);
  }

  if (needsRecent && recent) selected.push(recent);
  if (selected.length === 0 && recent && startYear >= year) selected.push(recent);
  if (selected.length === 0 && fullHistory) selected.push(fullHistory);
  if (selected.length === 0) {
    const plain = findAsset(assets, new RegExp(`_${gran}\\.csv$`, "i"));
    if (plain) selected.push(plain);
  }

  const unique = selected.filter((asset, index) => selected.findIndex((other) => other.href === asset.href) === index);
  if (unique.length === 0) {
    const available = assets.map((asset) => asset.name).slice(0, 12).join(", ");
    throw new Error(`No ${GRANULARITY_LABEL[gran]} history file covers ${startDate} to ${endDate}. Available assets: ${available}`);
  }
  return unique.slice(0, 3);
}

async function readMeasurements(assetsToRead: NamedAsset[], columns: string[] | null, gran: Granularity, requested: string[] | "all" | null): Promise<{ columns: string[]; rows: MeasurementRow[] }> {
  const tables = await Promise.all(assetsToRead.map(async (asset) => parseSemicolonCsv(await fetchCsv(asset.href))));
  const merged = new Map<string, Record<string, string>>();
  let headers: string[] = [];
  for (const table of tables) {
    if (table.length === 0) continue;
    headers = Object.keys(table[0]);
    const timeHeader = timestampHeader(headers);
    for (const record of table) {
      const stamp = record[timeHeader] ?? "";
      if (!stamp) continue;
      merged.set(stamp, record);
    }
  }
  if (headers.length === 0) return { columns: [], rows: [] };
  const timeHeader = timestampHeader(headers);
  const chosen = columns ?? chooseColumns(headers, timeHeader, requested, gran);
  const records = [...merged.values()];
  return { columns: chosen, rows: rowsToMeasurements(records, chosen, timeHeader) };
}

async function loadLegend(collection: StacCollection, columns: string[]): Promise<Record<string, { description: string; unit: string }>> {
  const asset = metaAsset(collection, "parameters");
  if (!asset) return {};
  try {
    const records = parseSemicolonCsv(await fetchCsv(asset.href));
    return parameterLegend(records, columns);
  } catch {
    return {};
  }
}

function boundJson(payload: {
  measurements: Array<{ time: string; values: Record<string, number> }>;
  truncated?: boolean;
  count: number;
  [key: string]: unknown;
}): string {
  let body = JSON.stringify(payload);
  while (body.length > 48000 && payload.measurements.length > 1) {
    payload.measurements = payload.measurements.slice(1);
    payload.truncated = true;
    payload.count = payload.measurements.length;
    body = JSON.stringify(payload);
  }
  return body;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleListStations(args: Record<string, unknown>): Promise<string> {
  const collection = resolveCollection(args.collection);
  const canton = typeof args.canton === "string" ? args.canton.trim().toUpperCase() : "";
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  const limit = clampLimit(args.limit, 30, 150);

  const document = await loadCollection(collection);
  const stationsAsset = metaAsset(document, "stations");
  if (!stationsAsset) throw new Error(`Collection ${collection.id} has no station list CSV`);

  const records = parseSemicolonCsv(await fetchCsv(stationsAsset.href));
  const stations = records
    .map((record) => {
      const altitude = Number(record.station_height_masl);
      const latitude = Number(record.station_coordinates_wgs84_lat);
      const longitude = Number(record.station_coordinates_wgs84_lon);
      return {
        code: record.station_abbr ?? "",
        name: record.station_name ?? "",
        canton: record.station_canton ?? "",
        altitude_m: Number.isFinite(altitude) ? altitude : null,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        ...(record.station_data_since ? { data_since: record.station_data_since } : {}),
      };
    })
    .filter((station) => station.code)
    .filter((station) => !canton || station.canton.toUpperCase() === canton)
    .filter((station) => {
      if (!query) return true;
      return station.code.toLowerCase().includes(query) || station.name.toLowerCase().includes(query);
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));

  return JSON.stringify({
    collection: collection.id,
    collection_alias: collection.alias,
    title: document.title || collection.title,
    count: Math.min(limit, stations.length),
    total_matches: stations.length,
    ...(canton ? { canton } : {}),
    ...(query ? { query } : {}),
    stations: stations.slice(0, limit),
    source: SOURCE,
  });
}

async function handleRecent(args: Record<string, unknown>): Promise<string> {
  const station = requireStation(args.station);
  const collection = resolveCollection(args.collection);
  const gran = resolveGranularity(args.granularity, "h");
  const limit = clampLimit(args.limit, 24, 168);
  const requested = requestedParameters(args.parameters);

  const [document, item] = await Promise.all([
    loadCollection(collection),
    loadItem(collection, station),
  ]);
  const asset = pickRecentAsset(assetsOf(item.assets), gran);
  const { columns, rows } = await readMeasurements([asset], null, gran, requested);
  const selected = rows.slice(-limit);
  const legend = await loadLegend(document, columns);

  return boundJson({
    station: station.toUpperCase(),
    station_name: item.properties?.title || station.toUpperCase(),
    collection: collection.id,
    granularity: gran,
    asset: asset.name,
    count: selected.length,
    timezone: "Europe/Zurich",
    parameters: legend,
    measurements: selected.map(({ time, values }) => ({ time, values })),
    source: SOURCE,
  });
}

async function handleHistory(args: Record<string, unknown>): Promise<string> {
  const station = requireStation(args.station);
  const collection = resolveCollection(args.collection);
  const gran = resolveGranularity(args.granularity, "d");
  const startDate = parseIsoDate(args.start_date, "start_date");
  const endDate = parseIsoDate(args.end_date, "end_date");
  if (endDate < startDate) throw new Error("end_date must be on or after start_date");
  const spanDays = Math.round(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000
  );
  if (spanDays > MAX_SPAN_DAYS[gran]) {
    throw new Error(
      `${GRANULARITY_LABEL[gran]} history is limited to ${MAX_SPAN_DAYS[gran]} days per request (got ${spanDays})`
    );
  }
  const limit = clampLimit(args.limit, 31, 100);
  const requested = requestedParameters(args.parameters);

  const [document, item] = await Promise.all([
    loadCollection(collection),
    loadItem(collection, station),
  ]);
  const assets = pickHistoryAssets(assetsOf(item.assets), gran, startDate, endDate);
  const { columns, rows } = await readMeasurements(assets, null, gran, requested);
  const inRange = rows.filter((row) => row.day >= startDate && row.day <= endDate);
  const truncated = inRange.length > limit;
  const selected = truncated ? inRange.slice(-limit) : inRange;
  const legend = await loadLegend(document, columns);

  return boundJson({
    station: station.toUpperCase(),
    station_name: item.properties?.title || station.toUpperCase(),
    collection: collection.id,
    granularity: gran,
    assets: assets.map((asset) => asset.name),
    start_date: startDate,
    end_date: endDate,
    count: selected.length,
    ...(truncated ? { truncated: true } : {}),
    timezone: "Europe/Zurich",
    parameters: legend,
    measurements: selected.map(({ time, values }) => ({ time, values })),
    source: SOURCE,
  });
}

export async function handleMeteoswiss(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_ogd_stations":
      return handleListStations(args);
    case "get_ogd_recent":
      return handleRecent(args);
    case "get_ogd_history":
      return handleHistory(args);
    default:
      throw new Error(`Unknown MeteoSwiss tool: ${name}`);
  }
}
