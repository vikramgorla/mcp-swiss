/**
 * SLF Snow Conditions module
 *
 * Data source: WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)
 * API: measurement-api.slf.ch/public/api
 *
 * Provides:
 *   - get_snow_conditions: current snow depth + fresh snow across Switzerland
 *   - list_snow_stations: all SLF snow measurement stations (IMIS + study plots)
 *   - get_snow_measurements: detailed measurements for a specific station
 */

import { fetchJSON } from "../utils/http.js";

const BASE = "https://measurement-api.slf.ch/public/api";

// ── API response types ─────────────────────────────────────────────────────

interface ImisStation {
  code: string;
  label: string;
  lon: number;
  lat: number;
  elevation: number;
  country_code: string;
  canton_code: string;
  type: string;
}

interface StudyPlotStation {
  code: string;
  label: string;
  lon: number;
  lat: number;
  elevation: number;
  country_code: string;
  canton_code: string;
}

interface DailySnow {
  station_code: string;
  measure_date: string;
  HS: number | null;
  HN_1D: number | null;
}

interface ImisMeasurement {
  station_code: string;
  measure_date: string;
  HS: number | null;
  TA_30MIN_MEAN: number | null;
  RH_30MIN_MEAN: number | null;
  TSS_30MIN_MEAN: number | null;
  TS0_30MIN_MEAN: number | null;
  TS25_30MIN_MEAN: number | null;
  TS50_30MIN_MEAN: number | null;
  TS100_30MIN_MEAN: number | null;
  RSWR_30MIN_MEAN: number | null;
  VW_30MIN_MEAN: number | null;
  VW_30MIN_MAX: number | null;
  DW_30MIN_MEAN: number | null;
  DW_30MIN_SD: number | null;
}

interface StudyPlotMeasurement {
  station_code: string;
  measure_date: string;
  HS: number | null;
  HN_1D: number | null;
  HNW_1D: number | null;
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const snowTools = [
  {
    name: "get_snow_conditions",
    description:
      "Current snow depth and 24h new snow at SLF IMIS stations, deepest first",
    inputSchema: {
      type: "object",
      properties: {
        canton: {
          type: "string",
          description: "Canton code, e.g. GR",
        },
        min_altitude: {
          type: "number",
          description: "Metres",
        },
        limit: {
          type: "number",
          description: "max 100",
          default: 20,
        },
      },
    },
  },
  {
    name: "list_snow_stations",
    description:
      "List SLF snow stations (IMIS automatic, manual study plots)",
    inputSchema: {
      type: "object",
      properties: {
        canton: {
          type: "string",
          description: "Canton code, e.g. GR",
        },
        type: {
          type: "string",
          enum: ["imis", "study-plot"],
          description: "Omit for both",
        },
        limit: {
          type: "number",
          description: "max 200",
          default: 20,
        },
      },
    },
  },
  {
    name: "get_snow_measurements",
    description:
      "Measurements for one SLF station: IMIS 30-min snow/weather data, or study-plot daily snow data",
    inputSchema: {
      type: "object",
      required: ["station_code"],
      properties: {
        station_code: {
          type: "string",
          description: "e.g. DAV2, WFJ2, 4AO0 (see list_snow_stations)",
        },
        type: {
          type: "string",
          enum: ["imis", "study-plot"],
          default: "imis",
        },
      },
    },
  },
];

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleGetSnowConditions(
  args: Record<string, unknown>
): Promise<string> {
  const canton = typeof args.canton === "string" ? args.canton.trim().toUpperCase() : undefined;
  const minAlt = typeof args.min_altitude === "number" ? args.min_altitude : undefined;
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);

  // Fetch snow data and station metadata in parallel
  const [dailySnow, stations] = await Promise.all([
    fetchJSON<DailySnow[]>(`${BASE}/imis/daily-snow`),
    fetchJSON<ImisStation[]>(`${BASE}/imis/stations`),
  ]);

  // Build station lookup
  const stationMap = new Map<string, ImisStation>();
  for (const s of stations) {
    stationMap.set(s.code, s);
  }

  // Join, filter, sort
  const joined = dailySnow
    .map((d) => {
      const s = stationMap.get(d.station_code);
      if (!s) return null;
      return {
        station: s.label,
        code: s.code,
        altitude_m: s.elevation,
        canton: s.canton_code,
        snow_depth_cm: d.HS,
        new_snow_24h_cm: d.HN_1D,
        date: d.measure_date?.slice(0, 10) ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => {
      if (!r) return false;
      if (canton && r.canton !== canton) return false;
      if (minAlt !== undefined && r.altitude_m < minAlt) return false;
      return true;
    })
    .sort((a, b) => (b.snow_depth_cm ?? 0) - (a.snow_depth_cm ?? 0))
    .slice(0, limit);

  return JSON.stringify({
    count: joined.length,
    filters: {
      ...(canton ? { canton } : {}),
      ...(minAlt !== undefined ? { min_altitude_m: minAlt } : {}),
    },
    stations: joined,
    source: "WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)",
  });
}

async function handleListSnowStations(
  args: Record<string, unknown>
): Promise<string> {
  const canton = typeof args.canton === "string" ? args.canton.trim().toUpperCase() : undefined;
  const typeFilter = typeof args.type === "string" ? args.type.trim().toLowerCase() : undefined;
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 200);

  // Fetch station lists (conditionally based on type filter)
  const fetchImis = !typeFilter || typeFilter === "imis";
  const fetchStudy = !typeFilter || typeFilter === "study-plot";

  const [imisStations, studyStations] = await Promise.all([
    fetchImis ? fetchJSON<ImisStation[]>(`${BASE}/imis/stations`) : Promise.resolve([]),
    fetchStudy ? fetchJSON<StudyPlotStation[]>(`${BASE}/study-plot/stations`) : Promise.resolve([]),
  ]);

  type StationEntry = {
    code: string;
    name: string;
    altitude_m: number;
    canton: string;
    type: string;
  };

  const combined: StationEntry[] = [
    ...imisStations.map((s) => ({
      code: s.code,
      name: s.label,
      altitude_m: s.elevation,
      canton: s.canton_code,
      type: "imis" as const,
    })),
    ...studyStations.map((s) => ({
      code: s.code,
      name: s.label,
      altitude_m: s.elevation,
      canton: s.canton_code,
      type: "study-plot" as const,
    })),
  ];

  const filtered = combined
    .filter((s) => !canton || s.canton === canton)
    .sort((a, b) => b.altitude_m - a.altitude_m)
    .slice(0, limit);

  return JSON.stringify({
    count: filtered.length,
    total_stations: combined.length,
    ...(canton ? { canton } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    stations: filtered,
    source: "WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)",
  });
}

async function handleGetSnowMeasurements(
  args: Record<string, unknown>
): Promise<string> {
  const stationCode = args.station_code;
  if (typeof stationCode !== "string" || !stationCode.trim()) {
    throw new Error("station_code is required");
  }
  const code = stationCode.trim();
  const stationType =
    typeof args.type === "string" && args.type.trim().toLowerCase() === "study-plot"
      ? "study-plot"
      : "imis";

  if (stationType === "study-plot") {
    let measurements: StudyPlotMeasurement[];
    try {
      measurements = await fetchJSON<StudyPlotMeasurement[]>(
        `${BASE}/study-plot/station/${encodeURIComponent(code)}/measurements`
      );
    } catch (err) {
      // SLF answers 404 NO_DATA when a manual study plot has no recent
      // observations — normal outside the winter season (roughly Nov–May).
      if (err instanceof Error && err.message.startsWith("HTTP 404")) {
        return JSON.stringify({
          station_code: code,
          type: "study-plot",
          measurement_count: 0,
          measurements: [],
          note: "No recent observations. Study plots are read manually during the snow season (roughly November–May); use type 'imis' for year-round automatic stations.",
          source: "WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)",
        });
      }
      throw err;
    }

    const latest = measurements.slice(-10).reverse().map((m) => ({
      time: m.measure_date,
      snow_depth_cm: m.HS,
      new_snow_24h_cm: m.HN_1D,
      new_snow_water_equiv_mm: m.HNW_1D,
    }));

    return JSON.stringify({
      station_code: code,
      type: "study-plot",
      measurement_count: latest.length,
      measurements: latest,
      source: "WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)",
    });
  }

  // IMIS station
  const measurements = await fetchJSON<ImisMeasurement[]>(
    `${BASE}/imis/station/${encodeURIComponent(code)}/measurements`
  );

  // Return latest 10 measurements, most recent first, with readable field names
  const latest = measurements.slice(-10).reverse().map((m) => ({
    time: m.measure_date,
    snow_depth_cm: m.HS,
    air_temp_c: m.TA_30MIN_MEAN,
    humidity_pct: m.RH_30MIN_MEAN,
    surface_temp_c: m.TSS_30MIN_MEAN,
    ground_temp_0cm_c: m.TS0_30MIN_MEAN,
    reflected_radiation_w_m2: m.RSWR_30MIN_MEAN,
    wind_speed_m_s: m.VW_30MIN_MEAN,
    wind_gust_m_s: m.VW_30MIN_MAX,
    wind_direction_deg: m.DW_30MIN_MEAN,
  }));

  return JSON.stringify({
    station_code: code,
    type: "imis",
    measurement_count: latest.length,
    measurements: latest,
    fields: {
      snow_depth_cm: "Total snow depth (HS)",
      air_temp_c: "Air temperature 30-min mean",
      humidity_pct: "Relative humidity 30-min mean",
      surface_temp_c: "Snow surface temperature",
      reflected_radiation_w_m2: "Reflected shortwave radiation",
      wind_speed_m_s: "Wind speed 30-min mean",
      wind_gust_m_s: "Wind gust 30-min max",
      wind_direction_deg: "Wind direction 30-min mean",
    },
    source: "WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)",
  });
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

export async function handleSnow(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_snow_conditions":
      return handleGetSnowConditions(args);
    case "list_snow_stations":
      return handleListSnowStations(args);
    case "get_snow_measurements":
      return handleGetSnowMeasurements(args);
    default:
      throw new Error(`Unknown snow tool: ${name}`);
  }
}
