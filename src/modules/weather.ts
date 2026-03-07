import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api.existenz.ch/apiv1";

// ── API response types ─────────────────────────────────────────────────────

interface WeatherReading {
  timestamp: number;
  loc: string;
  par: string;
  val: number;
}

interface StationDetails {
  id?: string;
  name?: string;
  canton?: string;
  alt?: number;
  lat?: number;
  lon?: number;
  "water-body-name"?: string;
  "water-body-type"?: string;
}

interface StationEntry {
  id: number;
  name: string;
  details?: StationDetails;
}

interface ApiResponse {
  source?: string;
  payload?: WeatherReading[] | Record<string, StationEntry>;
}

// ── Parameter name mapping ──────────────────────────────────────────────────

const PARAM_NAMES: Record<string, string> = {
  tt: "temperature_c",
  rr: "precipitation_mm",
  ss: "sunshine_min",
  rad: "radiation_w_m2",
  rh: "humidity_pct",
  td: "dewpoint_c",
  dd: "wind_direction_deg",
  ff: "wind_speed_m_s",
  fx: "wind_gust_m_s",
  qfe: "pressure_station_hpa",
  qff: "pressure_sea_hpa",
  qnh: "pressure_qnh_hpa",
};

// ── Tool definitions ────────────────────────────────────────────────────────

export const weatherTools = [
  {
    name: "get_weather",
    description: "Get current weather conditions at a Swiss MeteoSwiss station (e.g. BER=Bern, ZUE=Zürich, LUG=Lugano)",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Station code (e.g. BER, ZUE, LUG, GVE, SMA)" },
      },
    },
  },
  {
    name: "list_weather_stations",
    description: "List all available MeteoSwiss weather stations in Switzerland",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_weather_history",
    description: "Get historical weather data for a Swiss station",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: { type: "string", description: "Station code (e.g. BER)" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        end_date: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "get_water_level",
    description: "Get current river or lake water level and temperature at a Swiss hydrological station",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Hydro station ID (e.g. 2135 for Aare/Bern, 2243 for Rhine/Basel)" },
      },
    },
  },
  {
    name: "list_hydro_stations",
    description: "List all available BAFU hydrological monitoring stations (rivers and lakes) in Switzerland",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_water_history",
    description: "Get historical river/lake water level data for a Swiss hydrological station",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: { type: "string", description: "Hydro station ID" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        end_date: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function toISO(timestamp: number | undefined): string | undefined {
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function extractReadings(payload: WeatherReading[]) {
  return payload.map((p) => ({
    time: toISO(p.timestamp),
    param: p.par,
    value: p.val,
  }));
}

function extractWeatherStations(payload: Record<string, StationEntry>) {
  return Object.values(payload).map((s) => ({
    code: s.details?.id ?? s.name,
    name: s.details?.name ?? s.name,
    canton: s.details?.canton,
    alt: s.details?.alt,
    lat: s.details?.lat,
    lon: s.details?.lon,
  }));
}

function extractHydroStations(payload: Record<string, StationEntry>) {
  return Object.values(payload).map((s) => ({
    id: s.details?.id ?? s.name,
    name: s.details?.name,
    waterBody: s.details?.["water-body-name"],
    type: s.details?.["water-body-type"],
    lat: s.details?.lat,
    lon: s.details?.lon,
  }));
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function handleWeather(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_weather": {
      const url = buildUrl(`${BASE}/smn/latest`, {
        locations: args.station as string,
        app: "mcp-swiss",
        version: "0.1.0",
      });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = data?.payload;
      if (Array.isArray(payload)) {
        const ts = payload[0]?.timestamp;
        const readings: Record<string, number> = {};
        for (const p of payload) {
          const key = PARAM_NAMES[p.par] ?? p.par;
          readings[key] = p.val;
        }
        return JSON.stringify({
          station: args.station,
          timestamp: toISO(ts),
          ...readings,
          source: "MeteoSwiss via SwissMetNet",
        });
      }
      return JSON.stringify(data, null, 2);
    }

    case "list_weather_stations": {
      const url = buildUrl(`${BASE}/smn/locations`, { app: "mcp-swiss" });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = (data?.payload ?? {}) as Record<string, StationEntry>;
      const stations = extractWeatherStations(payload);
      return JSON.stringify({ count: stations.length, stations });
    }

    case "get_weather_history": {
      const url = buildUrl(`${BASE}/smn/daterange`, {
        locations: args.station as string,
        startdt: args.start_date as string,
        enddt: args.end_date as string,
        app: "mcp-swiss",
        version: "0.1.0",
      });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = data?.payload;
      if (Array.isArray(payload)) {
        const records = extractReadings(payload);
        return JSON.stringify({ station: args.station, count: records.length, data: records });
      }
      return JSON.stringify(data, null, 2);
    }

    case "get_water_level": {
      const url = buildUrl(`${BASE}/hydro/latest`, {
        locations: args.station as string,
        app: "mcp-swiss",
        version: "0.1.0",
      });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = data?.payload;
      if (Array.isArray(payload)) {
        const readings = extractReadings(payload);
        return JSON.stringify({ station: args.station, readings });
      }
      return JSON.stringify(data, null, 2);
    }

    case "list_hydro_stations": {
      const url = buildUrl(`${BASE}/hydro/locations`, { app: "mcp-swiss" });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = (data?.payload ?? {}) as Record<string, StationEntry>;
      const stations = extractHydroStations(payload);
      return JSON.stringify({ count: stations.length, stations });
    }

    case "get_water_history": {
      const url = buildUrl(`${BASE}/hydro/daterange`, {
        locations: args.station as string,
        startdt: args.start_date as string,
        enddt: args.end_date as string,
        app: "mcp-swiss",
        version: "0.1.0",
      });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = data?.payload;
      if (Array.isArray(payload)) {
        const records = extractReadings(payload);
        return JSON.stringify({ station: args.station, count: records.length, data: records });
      }
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown weather tool: ${name}`);
  }
}
