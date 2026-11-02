import { fetchBody } from "../utils/http.js";

const BASE_URL = "https://data.geo.admin.ch/ch.meteoschweiz.ogd-pollen";
const SOURCE = "MeteoSwiss";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PollenReading {
  type: string;
  concentration: number | null;
  unit: string;
}

interface HourlyRow {
  station: string;
  timestamp: string;
  pollen: PollenReading[];
}

interface DailyRow {
  date: string;
  pollen: PollenReading[];
}

interface StationInfo {
  code: string;
  name: string;
  canton: string;
  altitude_m: number | null;
  coordinates: { lat: number; lon: number } | null;
  data_since: string;
}

// ── Parameter mapping (MeteoSwiss pollen parameter codes → human names) ──────

const HOURLY_PARAMS: Record<string, string> = {
  kaalnuh0: "Alder",
  kabetuh0: "Birch",
  kacoryh0: "Hazel",
  kafaguh0: "Beech",
  kafraxh0: "Ash",
  kaquerh0: "Oak",
  khpoach0: "Grasses",
};

const DAILY_PARAMS: Record<string, string> = {
  kaalnud0: "Alder",
  kabetud0: "Birch",
  kacoryd0: "Hazel",
  kafagud0: "Beech",
  kafraxd0: "Ash",
  kaquerd0: "Oak",
  khpoacd0: "Grasses",
};

// ── CSV Helpers ───────────────────────────────────────────────────────────────

// MeteoSwiss serves these files as bare "text/csv" but the bytes are
// ISO-8859-1, so response.text() (UTF-8) mangles Genève and Zürich.
const csvDecoder = new TextDecoder("iso-8859-1");

async function fetchCSV(url: string): Promise<string> {
  // MeteoSwiss serves these CSVs as ISO-8859-1 with no charset header, so the
  // default UTF-8 decode mangles station names (Genève, Zürich).
  return fetchBody(url, undefined, async (response) =>
    csvDecoder.decode(await response.arrayBuffer())
  );
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function parsePollenValue(val: string): number | null {
  if (val === "" || val === undefined || val === null) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function normalizeStation(station: string): string {
  return station.trim().toUpperCase();
}

// ── Pollen stations ──────────────────────────────────────────────────────────

/**
 * Station codes for the tool schema, which has to be static. MeteoSwiss retires
 * sites, so the codes a call is checked against come from the live station list
 * below, not from here.
 */
const STATIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let _stationCodes: Set<string> | null = null;
let _stationCodesAt = 0;

/** Clear the cached station list (for testing) */
export function clearPollenCache(): void {
  _stationCodes = null;
  _stationCodesAt = 0;
}

async function publishedStations(): Promise<Set<string>> {
  if (_stationCodes && Date.now() - _stationCodesAt < STATIONS_CACHE_TTL_MS) return _stationCodes;

  const rows = parseCSV(await fetchCSV(`${BASE_URL}/ogd-pollen_meta_stations.csv`));
  const codes = new Set(
    rows.map((r) => (r.station_abbr || "").trim().toUpperCase()).filter(Boolean),
  );
  if (codes.size === 0) throw new Error("MeteoSwiss returned no pollen stations");

  _stationCodes = codes;
  _stationCodesAt = Date.now();
  return codes;
}

async function assertKnownStation(station: string): Promise<void> {
  const codes = await publishedStations();
  if (!codes.has(station)) {
    throw new Error(
      `Unknown pollen station "${station}". Valid stations: ${[...codes].sort().join(", ")}. Use list_pollen_stations for details.`,
    );
  }
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const pollenTools = [
  {
    name: "get_pollen_current",
    description:
      "Latest hourly pollen concentrations (alder, birch, hazel, beech, ash, oak, grasses) at a MeteoSwiss station",
    inputSchema: {
      type: "object" as const,
      required: ["station"],
      properties: {
        station: {
          type: "string",
          description: "e.g. PZH Zürich, PBE Bern, PBS Basel",
        },
      },
    },
  },
  {
    name: "get_pollen_daily",
    description:
      "Daily average pollen concentrations at a MeteoSwiss station",
    inputSchema: {
      type: "object" as const,
      required: ["station"],
      properties: {
        station: {
          type: "string",
          description: "e.g. PZH Zürich, PBE Bern",
        },
        days: {
          type: "number",
          description: "Recent days, max 90",
          default: 7,
        },
      },
    },
  },
  {
    name: "list_pollen_stations",
    description:
      "List MeteoSwiss pollen stations",
    inputSchema: {
      type: "object" as const,
      properties: {
        canton: {
          type: "string",
          description: "Canton code, e.g. ZH",
        },
      },
    },
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handlePollen(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "get_pollen_current":
      return getPollenCurrent(args);
    case "get_pollen_daily":
      return getPollenDaily(args);
    case "list_pollen_stations":
      return listPollenStations(args);
    default:
      throw new Error(`Unknown pollen tool: ${name}`);
  }
}

// ── get_pollen_current ────────────────────────────────────────────────────────

async function getPollenCurrent(args: Record<string, unknown>): Promise<string> {
  const rawStation = args.station as string | undefined;
  if (!rawStation || !rawStation.trim()) {
    throw new Error("station is required (e.g. PZH, PBE, PBS). Use list_pollen_stations for all codes.");
  }
  const station = normalizeStation(rawStation);
  await assertKnownStation(station);

  const stationLower = station.toLowerCase();
  const url = `${BASE_URL}/${stationLower}/ogd-pollen_${stationLower}_h_recent.csv`;
  const csv = await fetchCSV(url);
  const rows = parseCSV(csv);

  if (rows.length === 0) {
    return JSON.stringify({
      station,
      message: "No hourly pollen data available",
      source: SOURCE,
    });
  }

  // Get the last 6 hours of data
  const recentRows = rows.slice(-6);
  const headers = Object.keys(rows[0]);

  // Map param codes to readable names
  const paramMap: Record<string, string> = {};
  for (const header of headers) {
    if (HOURLY_PARAMS[header]) {
      paramMap[header] = HOURLY_PARAMS[header];
    }
  }

  const readings: HourlyRow[] = recentRows.map((row) => {
    const pollen: PollenReading[] = Object.entries(paramMap).map(([code, pollenName]) => ({
      type: pollenName,
      concentration: parsePollenValue(row[code]),
      unit: "pollen/m³",
    }));
    return {
      station: row.station_abbr || station,
      timestamp: row.reference_timestamp || "",
      pollen,
    };
  });

  // Also compute a summary for the most recent hour
  const latest = readings[readings.length - 1];
  const summary: Record<string, number | null> = {};
  for (const p of latest.pollen) {
    summary[p.type] = p.concentration;
  }

  return JSON.stringify({
    station,
    latest_timestamp: latest.timestamp,
    current_levels: summary,
    unit: "pollen/m³",
    recent_hours: readings,
    pollen_types: Object.values(HOURLY_PARAMS),
    note: "Concentration in pollen grains per cubic metre of air. Measured by automatic real-time pollen monitors.",
    source: SOURCE,
  });
}

// ── get_pollen_daily ──────────────────────────────────────────────────────────

async function getPollenDaily(args: Record<string, unknown>): Promise<string> {
  const rawStation = args.station as string | undefined;
  if (!rawStation || !rawStation.trim()) {
    throw new Error("station is required (e.g. PZH, PBE, PBS). Use list_pollen_stations for all codes.");
  }
  const station = normalizeStation(rawStation);
  await assertKnownStation(station);

  const rawDays = args.days as number | undefined;
  const days = Math.min(Math.max(rawDays ?? 7, 1), 90);

  const stationLower = station.toLowerCase();
  const url = `${BASE_URL}/${stationLower}/ogd-pollen_${stationLower}_d_recent.csv`;
  const csv = await fetchCSV(url);
  const rows = parseCSV(csv);

  if (rows.length === 0) {
    return JSON.stringify({
      station,
      days: 0,
      message: "No daily pollen data available",
      source: SOURCE,
    });
  }

  const headers = Object.keys(rows[0]);

  // Map d0 param codes to readable names
  const paramMap: Record<string, string> = {};
  for (const header of headers) {
    if (DAILY_PARAMS[header]) {
      paramMap[header] = DAILY_PARAMS[header];
    }
  }

  // Get the last N days
  const recentRows = rows.slice(-days);

  const dailyReadings: DailyRow[] = recentRows.map((row) => {
    const pollen: PollenReading[] = Object.entries(paramMap).map(([code, pollenName]) => ({
      type: pollenName,
      concentration: parsePollenValue(row[code]),
      unit: "pollen/m³",
    }));

    // Extract date from timestamp (format: "DD.MM.YYYY HH:MM")
    const ts = row.reference_timestamp || "";
    const datePart = ts.split(" ")[0] || ts;
    // Convert DD.MM.YYYY to YYYY-MM-DD
    const parts = datePart.split(".");
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : datePart;

    return {
      date: isoDate,
      pollen,
    };
  });

  return JSON.stringify({
    station,
    days: dailyReadings.length,
    period: "d0 (06:00 UTC – 06:00 UTC)",
    daily: dailyReadings,
    pollen_types: Object.values(DAILY_PARAMS),
    unit: "pollen/m³",
    note: "Daily average pollen concentration (d0 period: 06:00–06:00 UTC). Measured by automatic real-time pollen monitors.",
    source: SOURCE,
  });
}

// ── list_pollen_stations ──────────────────────────────────────────────────────

async function listPollenStations(args: Record<string, unknown>): Promise<string> {
  const cantonFilter = args.canton ? String(args.canton).trim().toUpperCase() : null;

  const url = `${BASE_URL}/ogd-pollen_meta_stations.csv`;
  const csv = await fetchCSV(url);
  const rows = parseCSV(csv);

  if (rows.length === 0) {
    return JSON.stringify({
      count: 0,
      stations: [],
      source: SOURCE,
    });
  }

  let stations: StationInfo[] = rows.map((row) => ({
    code: (row.station_abbr || "").trim(),
    name: (row.station_name || "").trim(),
    canton: (row.station_canton || "").trim(),
    altitude_m: row.station_height_masl ? Number(row.station_height_masl) : null,
    coordinates:
      row.station_coordinates_wgs84_lat && row.station_coordinates_wgs84_lon
        ? {
            lat: Number(row.station_coordinates_wgs84_lat),
            lon: Number(row.station_coordinates_wgs84_lon),
          }
        : null,
    data_since: (row.station_data_since || "").trim(),
  }));

  if (cantonFilter) {
    stations = stations.filter((s) => s.canton.toUpperCase() === cantonFilter);
  }

  return JSON.stringify({
    count: stations.length,
    network: "MeteoSwiss automatic pollen monitoring network",
    stations,
    pollen_types: ["Alder", "Birch", "Hazel", "Beech", "Ash", "Oak", "Grasses"],
    source: SOURCE,
  });
}
