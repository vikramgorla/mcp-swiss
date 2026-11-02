import { fetchJSON, buildUrl, VERSION } from "../utils/http.js";

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
    description: "Current weather at a MeteoSwiss station. For past dates use get_weather_history",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Station code, e.g. BER, ZUE, LUG, GVE, SMA" },
      },
    },
  },
  {
    name: "list_weather_stations",
    description: "List MeteoSwiss weather station codes",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_weather_history",
    description: "Historical weather readings for a MeteoSwiss station. Only the last 32 days are available",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: { type: "string", description: "Station code, e.g. BER" },
        start_date: { type: "string", description: "YYYY-MM-DD, within the last 32 days" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
        resolution: {
          type: "string",
          enum: ["auto", "raw", "hourly", "daily"],
          description: "auto summarises long ranges to min/max/mean per period",
          default: "auto",
        },
      },
    },
  },
  {
    name: "get_water_level",
    description: "Current river/lake level and temperature at a BAFU hydro station",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Hydro station ID, e.g. 2135 (Aare/Bern), 2243 (Rhine/Basel)" },
      },
    },
  },
  {
    name: "list_hydro_stations",
    description: "List BAFU hydro station IDs (rivers, lakes)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_water_history",
    description: "Historical river/lake levels for a BAFU hydro station. Only the last 32 days are available",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: { type: "string", description: "Hydro station ID" },
        start_date: { type: "string", description: "YYYY-MM-DD, within the last 32 days" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
        resolution: {
          type: "string",
          enum: ["auto", "raw", "hourly", "daily"],
          description: "auto summarises long ranges to min/max/mean per period",
          default: "auto",
        },
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

function compactWeatherStations(payload: Record<string, StationEntry>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const s of Object.values(payload)) {
    const code = s.details?.id ?? s.name;
    const name = s.details?.name ?? s.name;
    const canton = s.details?.canton;
    result[code] = canton ? `${name} (${canton})` : name;
  }
  return result;
}

function compactHydroStations(payload: Record<string, StationEntry>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const s of Object.values(payload)) {
    const id = s.details?.id ?? s.name;
    const name = s.details?.name ?? id;
    const water = s.details?.["water-body-name"];
    const type = s.details?.["water-body-type"];
    const suffix = [water, type].filter(Boolean).join(", ");
    result[id] = suffix ? `${name} (${suffix})` : name;
  }
  return result;
}

// ── Handler ─────────────────────────────────────────────────────────────────

const HISTORY_WINDOW_DAYS = 32;
// Stations report every 10 minutes across several parameters, so raw data runs
// to megabytes over a month. `auto` keeps as much shape as fits the response
// budget, stepping raw -> hourly -> daily until the payload is small enough.
const MAX_RESPONSE_BYTES = 45_000;

type Resolution = "auto" | "raw" | "hourly" | "daily";

function historyResolution(value: unknown): Resolution {
  return value === "raw" || value === "hourly" || value === "daily" ? value : "auto";
}

/** The upstream archive only holds ~32 days; older ranges come back empty. */
interface Reading {
  time: string | undefined;
  param: string;
  value: number;
}

interface Bucket {
  /** YYYY-MM-DD for daily buckets, YYYY-MM-DDTHH for hourly ones. */
  period: string;
  param: string;
  min: number;
  max: number;
  mean: number;
  readings: number;
}

function summarise(records: Reading[], unit: "hourly" | "daily"): Bucket[] {
  const width = unit === "daily" ? 10 : 13;
  const groups = new Map<string, { period: string; param: string; values: number[] }>();

  for (const r of records) {
    if (!r.time || typeof r.value !== "number" || Number.isNaN(r.value)) continue;
    const period = r.time.slice(0, width);
    const key = `${period}|${r.param}`;
    const group = groups.get(key) ?? { period, param: r.param, values: [] };
    group.values.push(r.value);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ period, param, values }) => ({
      period,
      param,
      min: round2(Math.min(...values)),
      max: round2(Math.max(...values)),
      mean: round2(values.reduce((sum, v) => sum + v, 0) / values.length),
      readings: values.length,
    }))
    .sort((a, b) => a.period.localeCompare(b.period) || a.param.localeCompare(b.param));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function historyResult(
  station: unknown,
  records: Reading[],
  startDate: unknown,
  resolution: Resolution = "auto"
): string {
  if (records.length === 0) {
    return JSON.stringify({
      station,
      count: 0,
      data: [],
      note: `No readings. api.existenz.ch keeps only the last ${HISTORY_WINDOW_DAYS} days${
        typeof startDate === "string" ? ` (requested from ${startDate})` : ""
      }; for older data use the MeteoSwiss/BAFU open-data archives.`,
    });
  }

  const render = (level: Exclude<Resolution, "auto">): string => {
    if (level === "raw") {
      return JSON.stringify({ station, resolution: "raw", count: records.length, data: records });
    }
    const summary = summarise(records, level);
    const out: Record<string, unknown> = {
      station,
      resolution: level,
      count: summary.length,
      readings_summarised: records.length,
      data: summary,
    };
    if (resolution === "auto") {
      out.note = `Summarised ${records.length} readings to ${level} min/max/mean. Use a shorter range, or resolution "raw", for individual readings.`;
    }
    return JSON.stringify(out);
  };

  if (resolution !== "auto") return render(resolution);

  // Keep the finest resolution that fits; an explicit choice is always honoured.
  for (const level of ["raw", "hourly", "daily"] as const) {
    const body = render(level);
    if (body.length <= MAX_RESPONSE_BYTES) return body;
  }
  return render("daily");
}

export async function handleWeather(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_weather": {
      const url = buildUrl(`${BASE}/smn/latest`, {
        locations: args.station as string,
        app: "mcp-swiss",
        version: VERSION,
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
      const stations = compactWeatherStations(payload);
      return JSON.stringify({ count: Object.keys(stations).length, stations });
    }

    case "get_weather_history": {
      const url = buildUrl(`${BASE}/smn/daterange`, {
        locations: args.station as string,
        startdate: args.start_date as string,
        enddate: args.end_date as string,
        app: "mcp-swiss",
        version: VERSION,
      });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = data?.payload;
      if (Array.isArray(payload)) {
        return historyResult(
          args.station,
          extractReadings(payload),
          args.start_date,
          historyResolution(args.resolution)
        );
      }
      return historyResult(args.station, [], args.start_date);
    }

    case "get_water_level": {
      const url = buildUrl(`${BASE}/hydro/latest`, {
        locations: args.station as string,
        app: "mcp-swiss",
        version: VERSION,
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
      const stations = compactHydroStations(payload);
      return JSON.stringify({ count: Object.keys(stations).length, stations });
    }

    case "get_water_history": {
      const url = buildUrl(`${BASE}/hydro/daterange`, {
        locations: args.station as string,
        startdate: args.start_date as string,
        enddate: args.end_date as string,
        app: "mcp-swiss",
        version: VERSION,
      });
      const data = await fetchJSON<ApiResponse>(url);
      const payload = data?.payload;
      if (Array.isArray(payload)) {
        return historyResult(
          args.station,
          extractReadings(payload),
          args.start_date,
          historyResolution(args.resolution)
        );
      }
      return historyResult(args.station, [], args.start_date);
    }

    default:
      throw new Error(`Unknown weather tool: ${name}`);
  }
}
