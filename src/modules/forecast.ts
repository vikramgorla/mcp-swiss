import { fetchBody, fetchJSON } from "../utils/http.js";
import { cached } from "../utils/cache.js";
import { WEATHER_SYMBOLS } from "./weather-symbols.js";

/**
 * MeteoSwiss local forecast (Open Government Data): the same forecast the
 * MeteoSwiss app shows for every postcode, ~170 weather stations and selected
 * mountain points, nine days ahead, updated hourly.
 *
 * Data layout (STAC collection ch.meteoschweiz.ogd-local-forecasting): one
 * item per UTC day, holding every hourly run; each asset is one parameter for
 * all ~5,800 points, as "point_id;point_type_id;Date;<param>". We read four
 * daily parameters (about 1.3 MB each) and keep them until the next run.
 */

const STAC = "https://data.geo.admin.ch/api/stac/v1/collections/ch.meteoschweiz.ogd-local-forecasting";
const POINTS_URL =
  "https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting/ogd-local-forecasting_meta_point.csv";
const SOURCE = "Source: MeteoSwiss (local forecast, Open Government Data)";

/** Daily values for the local calendar day (00:00-24:00 Swiss time). */
const PARAMS = {
  max: "tre200px",
  min: "tre200pn",
  rain: "rka150p0",
  symbol: "jp2000d0",
} as const;

const LANGUAGES = ["en", "de", "fr", "it"] as const;
type Language = (typeof LANGUAGES)[number];

export const forecastTools = [
  {
    name: "get_weather_forecast",
    description:
      "Official MeteoSwiss weather forecast for the next days (up to 9): daily high and low temperature, rain in mm and the expected weather, for a Swiss postcode, town, weather station or coordinates.",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: 'Postcode ("1860"), town ("Aigle"), weather station code ("AIG") or mountain point name',
        },
        lat: { type: "number", description: "Latitude, instead of location: uses the nearest forecast point" },
        lon: { type: "number", description: "Longitude, with lat" },
        days: { type: "number", description: "Days to return, today included (1-9, default 5)" },
        language: { type: "string", enum: LANGUAGES, description: "Weather descriptions in en (default), de, fr or it" },
      },
    },
  },
];

// ── Forecast points ──────────────────────────────────────────────────────────

interface ForecastPoint {
  id: string;
  type: "postcode" | "station" | "mountain";
  name: string;
  postcode?: string;
  station?: string;
  height_m: number | null;
  lat: number;
  lon: number;
}

const POINT_TYPES: Record<string, ForecastPoint["type"]> = { "1": "station", "2": "postcode", "3": "mountain" };

function latin1(response: Response): Promise<string> {
  return response.arrayBuffer().then((buf) => Buffer.from(new Uint8Array(buf)).toString("latin1"));
}

function splitCsvLine(line: string): string[] {
  // The point file has no quoted fields; the parameter file does, but we don't read it.
  return line.split(";").map((cell) => cell.trim());
}

const points = cached(24 * 60 * 60 * 1000, async (): Promise<ForecastPoint[]> => {
  const text = await fetchBody(POINTS_URL, { headers: { Accept: "text/csv" } }, latin1);
  const [header, ...rows] = text.split(/\r?\n/).filter((line) => line.trim());
  const cols = splitCsvLine(header);
  const at = (name: string) => cols.indexOf(name);
  const idx = {
    id: at("point_id"),
    type: at("point_type_id"),
    station: at("station_abbr"),
    postcode: at("postal_code"),
    name: at("point_name"),
    height: at("point_height_masl"),
    lat: at("point_coordinates_wgs84_lat"),
    lon: at("point_coordinates_wgs84_lon"),
  };
  if (Object.values(idx).some((i) => i < 0)) {
    throw new Error("MeteoSwiss changed the forecast point list format; please report this issue.");
  }
  return rows.flatMap((line) => {
    const cells = splitCsvLine(line);
    const type = POINT_TYPES[cells[idx.type]];
    const lat = Number(cells[idx.lat]);
    const lon = Number(cells[idx.lon]);
    if (!type || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const height = Number(cells[idx.height]);
    return [
      {
        id: cells[idx.id],
        type,
        name: cells[idx.name],
        ...(cells[idx.postcode] ? { postcode: cells[idx.postcode] } : {}),
        ...(cells[idx.station] ? { station: cells[idx.station] } : {}),
        height_m: Number.isFinite(height) ? Math.round(height) : null,
        lat,
        lon,
      },
    ];
  });
});

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Postcode, then exact name (postcode centres first), then station code, then a name prefix. */
export function findPoint(all: ForecastPoint[], query: string): ForecastPoint | undefined {
  const q = fold(query);
  if (/^\d{4}$/.test(q)) return all.find((p) => p.type === "postcode" && p.postcode === q);
  const rank = { postcode: 0, station: 1, mountain: 2 } as const;
  const byRank = (a: ForecastPoint, b: ForecastPoint) => rank[a.type] - rank[b.type];
  const exact = all.filter((p) => fold(p.name) === q).sort(byRank);
  if (exact.length) return exact[0];
  const station = all.find((p) => p.station && fold(p.station) === q);
  if (station) return station;
  return all
    .filter((p) => fold(p.name).startsWith(q))
    .sort((a, b) => byRank(a, b) || a.name.length - b.name.length)[0];
}

export function nearestPoint(all: ForecastPoint[], lat: number, lon: number): ForecastPoint | undefined {
  const rad = Math.PI / 180;
  let best: { p: ForecastPoint; d: number } | undefined;
  for (const p of all) {
    if (p.type === "mountain") continue; // a summit is rarely what "here" means
    const x = (p.lon - lon) * rad * Math.cos(((p.lat + lat) / 2) * rad);
    const y = (p.lat - lat) * rad;
    const d = x * x + y * y;
    if (!best || d < best.d) best = { p, d };
  }
  return best?.p;
}

// ── Latest run ───────────────────────────────────────────────────────────────

interface StacItem {
  assets?: Record<string, { href: string }>;
}

function utcDay(offsetDays: number): string {
  const d = new Date(Date.now() - offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** The newest run that already has all four daily files (runs upload one file at a time). */
export function latestCompleteRun(assets: Record<string, { href: string }>): { run: string; urls: Record<keyof typeof PARAMS, string> } | null {
  const byRun = new Map<string, Map<string, string>>();
  for (const [name, asset] of Object.entries(assets)) {
    const m = /\.(\d{12})\.([a-z0-9]+)\.csv$/.exec(name);
    if (!m) continue;
    if (!byRun.has(m[1])) byRun.set(m[1], new Map());
    byRun.get(m[1])!.set(m[2], asset.href);
  }
  for (const run of [...byRun.keys()].sort().reverse()) {
    const files = byRun.get(run)!;
    if (Object.values(PARAMS).every((p) => files.has(p))) {
      const urls = Object.fromEntries(
        Object.entries(PARAMS).map(([key, param]) => [key, files.get(param)!])
      ) as Record<keyof typeof PARAMS, string>;
      return { run, urls };
    }
  }
  return null;
}

const latestRun = cached(10 * 60 * 1000, async () => {
  for (const offset of [0, 1]) {
    let item: StacItem;
    try {
      item = await fetchJSON<StacItem>(`${STAC}/items/${utcDay(offset)}-ch`);
    } catch {
      continue; // today's item may not exist yet just after midnight UTC
    }
    const found = latestCompleteRun(item.assets ?? {});
    if (found) return found;
  }
  throw new Error("MeteoSwiss has no complete forecast run for today or yesterday. Try again later.");
});

// One file per parameter and run; a run is replaced hourly, so keep only the last.
const fileCache = new Map<string, Promise<Map<string, Array<[string, string]>>>>();

/** Rows for every point in one parameter file, as point_id -> [date, value][]. */
function loadParameter(url: string): Promise<Map<string, Array<[string, string]>>> {
  let pending = fileCache.get(url);
  if (!pending) {
    pending = fetchBody(url, { headers: { Accept: "text/csv" } }, latin1).then((text) => {
      const byPoint = new Map<string, Array<[string, string]>>();
      for (const line of text.split(/\r?\n/).slice(1)) {
        const [id, , date, value] = line.split(";");
        if (!id || !date) continue;
        if (!byPoint.has(id)) byPoint.set(id, []);
        byPoint.get(id)!.push([date.trim(), (value ?? "").trim()]);
      }
      return byPoint;
    });
    pending.catch(() => fileCache.delete(url));
    if (fileCache.size >= 8) fileCache.delete(fileCache.keys().next().value as string);
    fileCache.set(url, pending);
  }
  return pending;
}

// ── Handler ──────────────────────────────────────────────────────────────────

function num(raw: string | undefined, digits = 1): number | null {
  if (raw === undefined || raw === "" || raw === "-") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
}

function isoDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function runTime(run: string): string {
  return `${isoDate(run)}T${run.slice(8, 10)}:${run.slice(10, 12)}:00Z`;
}

async function getForecast(args: Record<string, unknown>): Promise<string> {
  const language: Language = LANGUAGES.includes(args.language as Language) ? (args.language as Language) : "en";
  const langIndex = LANGUAGES.indexOf(language);
  const days = Math.min(9, Math.max(1, Math.round(Number(args.days ?? 5)) || 5));
  const location = typeof args.location === "string" ? args.location.trim() : "";
  const lat = Number(args.lat);
  const lon = Number(args.lon);
  const hasCoords = args.lat !== undefined && args.lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon);

  if (!location && !hasCoords) {
    throw new Error('Give a location (postcode, town or station code, e.g. "1860" or "Aigle") or lat and lon.');
  }

  const all = await points.get();
  const point = location ? findPoint(all, location) : nearestPoint(all, lat, lon);
  if (!point) {
    throw new Error(
      `No MeteoSwiss forecast point matches "${location}". Try a 4-digit Swiss postcode, a town name in its local spelling, or coordinates.`
    );
  }

  const { run, urls } = await latestRun.get();
  const [max, min, rain, symbol] = await Promise.all([
    loadParameter(urls.max),
    loadParameter(urls.min),
    loadParameter(urls.rain),
    loadParameter(urls.symbol),
  ]);

  const series = (table: Map<string, Array<[string, string]>>) => new Map(table.get(point.id) ?? []);
  const maxS = series(max);
  const minS = series(min);
  const rainS = series(rain);
  const symbolS = series(symbol);
  const dates = [...new Set([...maxS.keys(), ...minS.keys()])].sort().slice(0, days);
  if (!dates.length) {
    throw new Error(`MeteoSwiss has no forecast values for ${point.name} in the current run. Try again in an hour.`);
  }

  const forecast = dates.map((date) => {
    const code = num(symbolS.get(date), 0);
    const text = code !== null ? WEATHER_SYMBOLS[code]?.[langIndex] : undefined;
    return {
      date: isoDate(date),
      weather: text ?? null,
      symbol_code: code,
      temp_max_c: num(maxS.get(date)),
      temp_min_c: num(minS.get(date)),
      precipitation_mm: num(rainS.get(date)),
    };
  });

  return JSON.stringify({
    location: {
      name: point.name,
      type: point.type,
      ...(point.postcode ? { postcode: point.postcode } : {}),
      ...(point.station ? { station: point.station } : {}),
      height_m: point.height_m,
      lat: point.lat,
      lon: point.lon,
    },
    forecast_issued: runTime(run),
    days: forecast,
    note: "Days are Swiss local calendar days. Temperatures at 2 m above ground. The MeteoSwiss app updates more often than this open data (hourly).",
    source: SOURCE,
  });
}

export async function handleForecast(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "get_weather_forecast") return getForecast(args);
  throw new Error(`Unknown forecast tool: ${name}`);
}

/** For tests: forget cached points, runs and files. */
export function resetForecastCache(): void {
  points.clear();
  latestRun.clear();
  fileCache.clear();
}
