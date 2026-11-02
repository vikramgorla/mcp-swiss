import { cached } from "../utils/cache.js";
import { buildUrl, fetchJSON } from "../utils/http.js";

const GEO_ADMIN = "https://api3.geo.admin.ch/rest/services/api/MapServer";
const NABELSTATIONEN_LAYER = "ch.bafu.nabelstationen";
/** Envelope covering Switzerland, used to pull the whole station layer at once. */
const CH_ENVELOPE = "5.5,45.5,10.9,48.1";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StationGeometry {
  x: number;
  y: number;
  spatialReference?: { wkid: number };
}

interface StationAttributes {
  name: string;
  url_de?: string;
  url_en?: string;
  label?: string;
}

interface NabelStationFeature {
  featureId: string;
  id: string;
  layerBodId: string;
  layerName?: string;
  bbox?: number[];
  geometry?: StationGeometry;
  attributes: StationAttributes;
}

interface NabelIdentifyResponse {
  results?: NabelStationFeature[];
}

// ── NABEL stations (BAFU/EMPA national monitoring network) ───────────────────
// Codes, names and coordinates match the geo.admin.ch ch.bafu.nabelstationen
// layer, which is the full network (16 sites). The layer carries no canton,
// altitude or site type, so those stay here; list_air_quality_stations merges
// in any code the layer gains later, so a new site is never silently missing.

interface NabelStation {
  name: string;
  canton?: string;
  lat: number;
  lon: number;
  altitude_m?: number;
  environment?: string;
}

const NABEL_STATIONS: Record<string, NabelStation> = {
  BAS: { name: "Basel-Binningen", canton: "BS", lat: 47.541081, lon: 7.583264, altitude_m: 316, environment: "urban" },
  BER: { name: "Bern-Bollwerk", canton: "BE", lat: 46.950993, lon: 7.440866, altitude_m: 540, environment: "urban" },
  BRM: { name: "Beromünster", canton: "LU", lat: 47.189614, lon: 8.175434, altitude_m: 797, environment: "rural" },
  CHA: { name: "Chaumont", canton: "NE", lat: 47.049465, lon: 6.979204, altitude_m: 1136, environment: "rural-elevated" },
  DAV: { name: "Davos", canton: "GR", lat: 46.815199, lon: 9.855859, altitude_m: 1590, environment: "alpine" },
  DUE: { name: "Duebendorf", canton: "ZH", lat: 47.404842, lon: 8.608474, altitude_m: 432, environment: "suburban" },
  HAE: { name: "Haerkingen", canton: "SO", lat: 47.311911, lon: 7.8205, altitude_m: 430, environment: "rural-roadside" },
  JUN: { name: "Jungfraujoch", canton: "VS", lat: 46.547499, lon: 7.985071, altitude_m: 3578, environment: "high-alpine" },
  LAU: { name: "Lausanne", canton: "VD", lat: 46.522018, lon: 6.639701, altitude_m: 540, environment: "urban" },
  LUG: { name: "Lugano", canton: "TI", lat: 46.011117, lon: 8.957165, altitude_m: 273, environment: "urban" },
  MAG: { name: "Magadino-Cadenazzo", canton: "TI", lat: 46.160376, lon: 8.933939, altitude_m: 203, environment: "rural" },
  PAY: { name: "Payerne", canton: "VD", lat: 46.813057, lon: 6.944473, altitude_m: 490, environment: "rural" },
  RIG: { name: "Rigi-Seebodenalp", canton: "SZ", lat: 47.06741, lon: 8.46333, altitude_m: 1030, environment: "alpine" },
  SIO: { name: "Sion-Aerodrome", canton: "VS", lat: 46.220201, lon: 7.341966, altitude_m: 482, environment: "urban" },
  TAE: { name: "Taenikon", canton: "TG", lat: 47.479771, lon: 8.904686, altitude_m: 540, environment: "rural" },
  ZUE: { name: "Zürich-Kaserne", canton: "ZH", lat: 47.377586, lon: 8.530406, altitude_m: 409, environment: "urban" },
};

// ── Swiss legal air quality limits (LRV - Luftreinhalteordnung, Swiss Clean Air Act) ──
// Immissionsgrenzwerte (IGW) — annual mean limits in µg/m³

const SWISS_LIMITS: Record<string, { annual_mean_µg_m3?: number; daily_mean_µg_m3?: number; hourly_mean_µg_m3?: number; who_note?: string }> = {
  PM10:  { annual_mean_µg_m3: 20,  daily_mean_µg_m3: 50,  who_note: "WHO 2021 guideline: 15 µg/m³ annual, 45 µg/m³ daily" },
  PM2_5: { annual_mean_µg_m3: 10,  who_note: "WHO 2021 guideline: 5 µg/m³ annual" },
  O3:    { hourly_mean_µg_m3: 120, who_note: "Peak season 8h: 60 µg/m³ (WHO 2021)" },
  NO2:   { annual_mean_µg_m3: 30,  hourly_mean_µg_m3: 100, who_note: "WHO 2021 guideline: 10 µg/m³ annual" },
  SO2:   { annual_mean_µg_m3: 30,  daily_mean_µg_m3: 100 },
};

// ── Tool definitions ──────────────────────────────────────────────────────────

export const airqualityTools = [
  {
    name: "list_air_quality_stations",
    description:
      "List NABEL air-quality monitoring stations (BAFU/Empa)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_air_quality",
    description:
      "NABEL station info: location, environment type, legal limits (LRV) and a link to BAFU live data (no measurements returned)",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: {
          type: "string",
          description:
            "Station code, e.g. BER, ZUE, LUG, BAS, DAV",
        },
      },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeStationCode(code: string): string {
  return code.trim().toUpperCase();
}

// One identify call returns the whole layer, so both tools work off a single
// cached copy instead of one request per lookup.
const STATIONS_TTL_MS = 24 * 60 * 60 * 1000;

const liveStations = cached(STATIONS_TTL_MS, async () => {
  const url = buildUrl(`${GEO_ADMIN}/identify`, {
    geometryType: "esriGeometryEnvelope",
    geometry: CH_ENVELOPE,
    mapExtent: CH_ENVELOPE,
    imageDisplay: "100,100,96",
    tolerance: 0,
    layers: `all:${NABELSTATIONEN_LAYER}`,
    returnGeometry: true,
    sr: 4326,
    limit: 200,
  });
  const data = await fetchJSON<NabelIdentifyResponse>(url);
  const found: Record<string, NabelStation> = {};
  for (const f of data.results ?? []) {
    const code = normalizeStationCode(f.featureId ?? f.id ?? "");
    const geometry = f.geometry;
    if (!code || !geometry) continue;
    found[code] = { name: f.attributes?.name ?? code, lat: geometry.y, lon: geometry.x };
  }
  return found;
});

/** Clear the station-layer cache (for testing) */
export function clearAirQualityCache(): void {
  liveStations.clear();
}

/**
 * The curated table, plus any station the layer reports that it does not list
 * yet. A layer outage falls back to the table rather than failing the call.
 */
async function allStations(): Promise<Record<string, NabelStation>> {
  let live: Record<string, NabelStation>;
  try {
    live = await liveStations.get();
  } catch {
    return { ...NABEL_STATIONS };
  }
  const merged: Record<string, NabelStation> = { ...live, ...NABEL_STATIONS };
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
}

function describe(info: NabelStation): string {
  const canton = info.canton ? ` (${info.canton})` : "";
  return info.environment ? `${info.name}${canton} — ${info.environment}` : `${info.name}${canton}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleAirQuality(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "list_air_quality_stations": {
      const stations: Record<string, string> = {};
      for (const [code, info] of Object.entries(await allStations())) {
        stations[code] = describe(info);
      }
      return JSON.stringify({
        count: Object.keys(stations).length,
        network: "NABEL — Nationales Beobachtungsnetz für Luftfremdstoffe",
        operator: "BAFU (Swiss Federal Office for the Environment) / EMPA",
        source: "geo.admin.ch ch.bafu.nabelstationen",
        data_portal: "https://www.bafu.admin.ch/bafu/en/home/topics/air/state/data/nabel.html",
        stations,
      });
    }

    case "get_air_quality": {
      const code = normalizeStationCode(args.station as string);
      const stations = await allStations();
      const station = stations[code];

      if (!station) {
        throw new Error(
          `Unknown NABEL station code "${code}". Known stations: ${Object.keys(stations).join(", ")}. ` +
            `Use list_air_quality_stations to see all options.`
        );
      }

      return JSON.stringify({
        station: code,
        name: station.name,
        canton: station.canton,
        coordinates: { lat: station.lat, lon: station.lon },
        altitude_m: station.altitude_m,
        environment: station.environment,
        network: "NABEL",
        operator: "BAFU / EMPA",
        source: "geo.admin.ch — ch.bafu.nabelstationen",
        data_note:
          "Live NABEL measurements (PM10, PM2.5, O3, NO2, SO2) are published on the BAFU data portal. " +
          "No public REST API for real-time values — use the portal link below.",
        live_data_portal: "https://www.bafu.admin.ch/bafu/en/home/topics/air/state/data/nabel.html",
        swiss_legal_limits_lrv: SWISS_LIMITS,
        limits_reference: "LRV (Luftreinhalteordnung / Swiss Clean Air Act, Annex 7)",
      });
    }

    default:
      throw new Error(`Unknown air quality tool: ${name}`);
  }
}
