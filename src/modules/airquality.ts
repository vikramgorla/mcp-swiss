import { fetchJSON, buildUrl } from "../utils/http.js";

const GEO_ADMIN = "https://api3.geo.admin.ch/rest/services/api/MapServer";
const NABELSTATIONEN_LAYER = "ch.bafu.nabelstationen";

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

interface NabelStationResponse {
  feature?: NabelStationFeature;
}

interface FindResult {
  featureId: string;
  id: string;
  geometry?: StationGeometry;
  attributes: StationAttributes;
  bbox?: number[];
}

interface FindResponse {
  results: FindResult[];
}

// ── Known NABEL stations (BAFU/EMPA national monitoring network) ─────────────
// Source: geo.admin.ch ch.bafu.nabelstationen layer
// These are the official NABEL (Nationales Beobachtungsnetz für Luftfremdstoffe) stations

const NABEL_STATIONS: Record<
  string,
  { name: string; canton: string; lat: number; lon: number; altitude_m?: number; environment: string }
> = {
  BAS: { name: "Basel-Binningen", canton: "BS", lat: 47.541081, lon: 7.583264, altitude_m: 316, environment: "urban" },
  BER: { name: "Bern-Bollwerk", canton: "BE", lat: 46.950993, lon: 7.440866, altitude_m: 540, environment: "urban" },
  CHA: { name: "Chaumont", canton: "NE", lat: 47.049465, lon: 6.979204, altitude_m: 1136, environment: "rural-elevated" },
  DAV: { name: "Davos", canton: "GR", lat: 46.815199, lon: 9.855859, altitude_m: 1590, environment: "alpine" },
  DUE: { name: "Duebendorf", canton: "ZH", lat: 47.404842, lon: 8.608474, altitude_m: 432, environment: "suburban" },
  HAE: { name: "Haerkingen", canton: "SO", lat: 47.311911, lon: 7.8205, altitude_m: 430, environment: "rural-roadside" },
  LAU: { name: "Lausanne", canton: "VD", lat: 46.522018, lon: 6.639701, altitude_m: 540, environment: "urban" },
  LUG: { name: "Lugano", canton: "TI", lat: 46.011117, lon: 8.957165, altitude_m: 273, environment: "urban" },
  MAG: { name: "Magadino-Cadenazzo", canton: "TI", lat: 46.160376, lon: 8.933939, altitude_m: 203, environment: "rural" },
  PAY: { name: "Payerne", canton: "VD", lat: 46.813057, lon: 6.944473, altitude_m: 490, environment: "rural" },
  RIG: { name: "Rigi-Seebodenalp", canton: "SZ", lat: 47.06741, lon: 8.46333, altitude_m: 1030, environment: "alpine" },
  SIO: { name: "Sion-Aerodrome", canton: "VS", lat: 46.220201, lon: 7.341966, altitude_m: 482, environment: "urban" },
  TAE: { name: "Taenikon", canton: "TG", lat: 47.479771, lon: 8.904686, altitude_m: 540, environment: "rural" },
  ZUE: { name: "Zürich-Kaserne", canton: "ZH", lat: 47.3769, lon: 8.5417, altitude_m: 409, environment: "urban" },
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
      "List all official Swiss NABEL (Nationales Beobachtungsnetz für Luftfremdstoffe) air quality monitoring stations operated by BAFU/EMPA. Returns station codes, names, cantons, coordinates, and environment types.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_air_quality",
    description:
      "Get information about a Swiss NABEL air quality monitoring station, including location, environment type, Swiss legal limits (LRV), and a direct link to the BAFU live data portal. Use station codes from list_air_quality_stations (e.g. BER=Bern, ZUE=Zürich, LUG=Lugano).",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: {
          type: "string",
          description:
            "NABEL station code (e.g. BER, ZUE, LUG, BAS, DAV). Use list_air_quality_stations for all codes.",
        },
      },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeStationCode(code: string): string {
  return code.trim().toUpperCase();
}

async function fetchStationFromApi(stationCode: string): Promise<NabelStationFeature | null> {
  const url = `${GEO_ADMIN}/${NABELSTATIONEN_LAYER}/${encodeURIComponent(stationCode)}?returnGeometry=true&sr=4326`;
  try {
    const data = await fetchJSON<NabelStationResponse>(url);
    return data?.feature ?? null;
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleAirQuality(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "list_air_quality_stations": {
      // Build compact station dict from our hardcoded registry (confirmed via geo.admin.ch API)
      const stations: Record<string, string> = {};
      for (const [code, info] of Object.entries(NABEL_STATIONS)) {
        stations[code] = `${info.name} (${info.canton}) — ${info.environment}`;
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
      const local = NABEL_STATIONS[code];

      if (!local) {
        const knownCodes = Object.keys(NABEL_STATIONS).join(", ");
        throw new Error(
          `Unknown NABEL station code "${code}". Known stations: ${knownCodes}. ` +
            `Use list_air_quality_stations to see all options.`
        );
      }

      // Optionally enrich from live geo.admin.ch API (non-blocking fallback)
      let apiName: string | undefined;
      try {
        const feature = await fetchStationFromApi(code);
        apiName = feature?.attributes?.name;
      } catch {
        // continue with local data
      }

      const stationName = apiName ?? local.name;

      return JSON.stringify({
        station: code,
        name: stationName,
        canton: local.canton,
        coordinates: { lat: local.lat, lon: local.lon },
        altitude_m: local.altitude_m,
        environment: local.environment,
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
