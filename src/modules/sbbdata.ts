/**
 * SBB Open Data portal module
 *
 * Data source: data.sbb.ch Opendatasoft Explore API v2.1 (no API key)
 * API: https://data.sbb.ch/api/explore/v2.1/
 *
 * Provides:
 *   - get_station_passengers: boarding and alighting counts per station
 *   - get_station_punctuality: previous-day arrival and departure punctuality
 *   - get_station_accessibility: platform rail-free access
 */

import { fetchJSON, buildUrl } from "../utils/http.js";

const API = "https://data.sbb.ch/api/explore/v2.1/catalog/datasets";
const SOURCE = "SBB Open Data (data.sbb.ch)";

interface OdsResponse<T> {
  total_count?: number;
  results?: T[];
}

interface PassengerRecord {
  bahnhof_gare_stazione?: string;
  uic?: number | null;
  code_codice?: string;
  kt_ct_cantone?: string;
  jahr_annee_anno?: string;
  dtv_tjm_tgm?: number | null;
  dwv_tmjo_tfm?: number | null;
  dnwv_tmjno_tmgnl?: number | null;
  evu_ef_itf?: string;
}

interface PunctualityRecord {
  betriebstag?: string;
  haltestellen_name?: string;
  linien_text?: string;
  verkehrsmittel_text?: string;
  ankunftszeit?: string | null;
  an_prognose?: string | null;
  ankunftsverspatung?: string | null;
  abfahrtszeit?: string | null;
  ab_prognose?: string | null;
  abfahrtsverspatung?: string | null;
  faellt_aus_tf?: boolean | null;
}

interface PlatformRecord {
  bps?: string;
  bps_name?: string;
  p_nr?: string;
  p_lange?: number | null;
  z_schienenfrei?: string | null;
  perrontyp?: string | null;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

const stationProperty = {
  type: "string",
  description: "Station name as published by SBB (e.g. Bern, Zürich HB, Genève).",
};

const containsProperty = {
  type: "boolean",
  description: "When true, match station names that contain the text. Default false matches the whole name.",
};

export const sbbDataTools = [
  {
    name: "get_station_passengers",
    description:
      "Passenger counts for an SBB station from the data.sbb.ch frequency dataset. " +
      "Returns average daily, weekday, and weekend boardings and alightings (Ein- und Aussteigende). " +
      "Newest year first.",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: stationProperty,
        year: {
          type: "number",
          description: "Optional year (e.g. 2024). Omit to return the newest years.",
        },
        contains: containsProperty,
        limit: {
          type: "number",
          description: "Maximum rows (default 10, max 30).",
        },
      },
    },
  },
  {
    name: "get_station_punctuality",
    description:
      "Punctuality for an SBB stop on the previous operating day (ist-daten-sbb target vs actual times). " +
      "Returns stop counts, arrival and departure delay counts, cancellations, and a short sample of delayed arrivals. " +
      "A stop is delayed when SBB flags it, which is generally a delay of about three minutes or more.",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: stationProperty,
        line: {
          type: "string",
          description: "Optional line filter (e.g. IC1, IR15, S7).",
        },
        contains: containsProperty,
        limit: {
          type: "number",
          description: "Delayed-arrival samples to include (default 5, max 15).",
        },
      },
    },
  },
  {
    name: "get_station_accessibility",
    description:
      "Platform accessibility for an SBB station: platform number, length, type, and whether access is rail-free (step-free). " +
      "Source: data.sbb.ch platform dataset.",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: stationProperty,
        contains: containsProperty,
        limit: {
          type: "number",
          description: "Maximum platforms (default 30, max 80).",
        },
      },
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

function requireStation(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("station is required");
  const station = value.trim().replace(/["\\%]/g, "");
  if (!station) throw new Error("station is required");
  if (station.length > 80) throw new Error("station name is too long");
  return station;
}

function flag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function nameClause(field: string, station: string, contains: boolean): string {
  return contains ? `${field} like "${station}"` : `${field}="${station}"`;
}

function recordsUrl(dataset: string, params: Record<string, string | number | boolean | undefined>): string {
  return buildUrl(`${API}/${dataset}/records`, params);
}

async function loadRecords<T>(dataset: string, params: Record<string, string | number | boolean | undefined>): Promise<OdsResponse<T>> {
  return fetchJSON<OdsResponse<T>>(recordsUrl(dataset, params));
}

function sameName(left: string | undefined, right: string): boolean {
  return (left ?? "").trim().toLowerCase() === right.trim().toLowerCase();
}

function delaySeconds(planned: string | null | undefined, actual: string | null | undefined): number | null {
  if (!planned || !actual) return null;
  const start = Date.parse(planned);
  const end = Date.parse(actual);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 1000);
}

function isDelayed(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

function isRailFree(value: string | null | undefined): boolean {
  return ["ja", "yes", "oui", "si", "true"].includes((value ?? "").trim().toLowerCase());
}

function percent(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round(((total - part) / total) * 1000) / 10;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handlePassengers(args: Record<string, unknown>): Promise<string> {
  const station = requireStation(args.station);
  const contains = flag(args.contains, false);
  const limit = clampLimit(args.limit, 10, 30);
  const year = typeof args.year === "number" && Number.isFinite(args.year) ? Math.floor(args.year) : undefined;
  if (year !== undefined && (year < 1990 || year > 2100)) throw new Error("year must be a four-digit year");

  const data = await loadRecords<PassengerRecord>("passagierfrequenz", {
    where: nameClause("bahnhof_gare_stazione", station, contains || year !== undefined),
    order_by: "jahr_annee_anno desc",
    limit: contains || year !== undefined ? 100 : limit,
    select: "bahnhof_gare_stazione,uic,code_codice,kt_ct_cantone,jahr_annee_anno,dtv_tjm_tgm,dwv_tmjo_tfm,dnwv_tmjno_tmgnl,evu_ef_itf",
  });

  const rows = (data.results ?? [])
    .filter((row) => contains || sameName(row.bahnhof_gare_stazione, station))
    .filter((row) => year === undefined || String(row.jahr_annee_anno ?? "").startsWith(String(year)))
    .slice(0, limit)
    .map((row) => ({
      station: row.bahnhof_gare_stazione ?? station,
      year: row.jahr_annee_anno ?? "",
      code: row.code_codice ?? "",
      uic: row.uic ?? null,
      canton: row.kt_ct_cantone ?? "",
      operator: row.evu_ef_itf ?? "",
      daily_avg: row.dtv_tjm_tgm ?? null,
      weekday_avg: row.dwv_tmjo_tfm ?? null,
      weekend_avg: row.dnwv_tmjno_tmgnl ?? null,
    }));

  return JSON.stringify({
    station,
    ...(year !== undefined ? { year } : {}),
    contains,
    count: rows.length,
    unit: "Average boardings and alightings per day",
    stations: rows,
    source: SOURCE,
    dataset: "passagierfrequenz",
  });
}

async function handlePunctuality(args: Record<string, unknown>): Promise<string> {
  const station = requireStation(args.station);
  const contains = flag(args.contains, false);
  const limit = clampLimit(args.limit, 5, 15);
  const line = typeof args.line === "string" ? args.line.trim().replace(/["\\%]/g, "") : "";
  const where = [
    nameClause("haltestellen_name", station, contains),
    line ? `linien_text="${line}"` : "",
  ].filter(Boolean).join(" and ");

  const selectSample = "betriebstag,haltestellen_name,linien_text,verkehrsmittel_text,ankunftszeit,an_prognose,ankunftsverspatung,abfahrtszeit,ab_prognose,abfahrtsverspatung,faellt_aus_tf";
  const [allStops, lateArrivals, lateDepartures, cancelled] = await Promise.all([
    loadRecords<PunctualityRecord>("ist-daten-sbb", { where, limit: 1, select: "betriebstag,haltestellen_name" }),
    loadRecords<PunctualityRecord>("ist-daten-sbb", {
      where: `${where} and ankunftsverspatung="true"`,
      limit,
      select: selectSample,
    }),
    loadRecords<PunctualityRecord>("ist-daten-sbb", {
      where: `${where} and abfahrtsverspatung="true"`,
      limit: 1,
      select: "betriebstag",
    }),
    loadRecords<PunctualityRecord>("ist-daten-sbb", {
      where: `${where} and faellt_aus_tf=true`,
      limit: 1,
      select: "betriebstag",
    }),
  ]);

  const stops = allStops.total_count ?? 0;
  const delayedArrivals = lateArrivals.total_count ?? 0;
  const delayedDepartures = lateDepartures.total_count ?? 0;
  const cancellations = cancelled.total_count ?? 0;
  const operatingDay = allStops.results?.[0]?.betriebstag
    ?? lateArrivals.results?.[0]?.betriebstag
    ?? null;

  const samples = (lateArrivals.results ?? []).map((row) => ({
    stop: row.haltestellen_name ?? station,
    line: row.linien_text ?? "",
    category: row.verkehrsmittel_text ?? "",
    cancelled: row.faellt_aus_tf === true,
    arrival_planned: row.ankunftszeit ?? null,
    arrival_actual: row.an_prognose ?? null,
    arrival_delayed: isDelayed(row.ankunftsverspatung),
    arrival_delay_seconds: delaySeconds(row.ankunftszeit, row.an_prognose),
    departure_planned: row.abfahrtszeit ?? null,
    departure_actual: row.ab_prognose ?? null,
    departure_delayed: isDelayed(row.abfahrtsverspatung),
    departure_delay_seconds: delaySeconds(row.abfahrtszeit, row.ab_prognose),
  }));

  return JSON.stringify({
    station,
    ...(line ? { line } : {}),
    contains,
    operating_day: operatingDay,
    stops,
    delayed_arrivals: delayedArrivals,
    delayed_departures: delayedDepartures,
    cancellations,
    on_time_arrivals_pct: percent(delayedArrivals, stops),
    on_time_departures_pct: percent(delayedDepartures, stops),
    delayed_arrival_sample: samples,
    note: "Covers the previous operating day published by SBB. Delay flags follow the SBB threshold, usually about 3 minutes.",
    source: SOURCE,
    dataset: "ist-daten-sbb",
  });
}

async function handleAccessibility(args: Record<string, unknown>): Promise<string> {
  const station = requireStation(args.station);
  const contains = flag(args.contains, false);
  const limit = clampLimit(args.limit, 30, 80);

  const data = await loadRecords<PlatformRecord>("perron", {
    where: nameClause("bps_name", station, contains),
    limit: contains ? 100 : limit,
    select: "bps,bps_name,p_nr,p_lange,z_schienenfrei,perrontyp",
  });

  const platforms = (data.results ?? [])
    .filter((row) => contains || sameName(row.bps_name, station))
    .slice(0, limit)
    .map((row) => ({
      station: row.bps_name ?? station,
      abbreviation: row.bps ?? "",
      platform: row.p_nr ?? "",
      type: row.perrontyp ?? "",
      length_m: row.p_lange ?? null,
      rail_free_access: isRailFree(row.z_schienenfrei),
      rail_free_access_raw: row.z_schienenfrei ?? "",
    }));

  const railFree = platforms.filter((platform) => platform.rail_free_access).length;

  return JSON.stringify({
    station,
    contains,
    platform_count: platforms.length,
    rail_free_platforms: railFree,
    other_platforms: platforms.length - railFree,
    platforms,
    source: SOURCE,
    dataset: "perron",
  });
}

export async function handleSbbData(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_station_passengers":
      return handlePassengers(args);
    case "get_station_punctuality":
      return handlePunctuality(args);
    case "get_station_accessibility":
      return handleAccessibility(args);
    default:
      throw new Error(`Unknown SBB data tool: ${name}`);
  }
}
