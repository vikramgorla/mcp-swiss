import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://transport.opendata.ch/v1";

// ── Types ───────────────────────────────────────────────────────────────────

interface Station {
  id: string | null;
  name: string | null;
  score: number | null;
  coordinate: { type: string; x: number | null; y: number | null };
  distance: number | null;
}

interface Prognosis {
  platform: string | null;
  arrival: string | null;
  departure: string | null;
  capacity1st: number | null;
  capacity2nd: number | null;
}

interface Stop {
  station: Station;
  arrival: string | null;
  departure: string | null;
  delay: number | null;
  platform: string | null;
  prognosis: Prognosis | null;
}

interface BoardEntry {
  stop: Stop;
  name: string;
  category: string;
  number: string;
  operator: string;
  to: string;
  passList: Stop[];
  capacity1st: number | null;
  capacity2nd: number | null;
}

interface Section {
  journey: {
    name: string;
    category: string;
    number: string;
    operator: string;
    to: string;
    passList: Stop[];
    capacity1st: number | null;
    capacity2nd: number | null;
  } | null;
  walk: unknown | null;
  departure: Stop;
  arrival: Stop;
}

interface Connection {
  from: Stop;
  to: Stop;
  duration: string;
  transfers: number;
  sections: Section[];
  capacity1st: number | null;
  capacity2nd: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function slimBoardEntry(entry: BoardEntry) {
  return {
    line: `${entry.category}${entry.number}`,
    to: entry.to,
    departure: entry.stop.departure,
    delay: entry.stop.delay,
    platform: entry.stop.platform,
    operator: entry.operator,
  };
}

function slimConnection(conn: Connection) {
  return {
    from: conn.from.station?.name,
    to: conn.to.station?.name,
    departure: conn.from.departure,
    arrival: conn.to.arrival,
    duration: conn.duration,
    transfers: conn.transfers,
    sections: conn.sections.map((s) => ({
      type: s.journey ? "journey" : "walk",
      line: s.journey ? `${s.journey.category}${s.journey.number}` : undefined,
      from: s.departure.station?.name,
      departure: s.departure.departure,
      platform: s.departure.platform,
      to: s.arrival.station?.name,
      arrival: s.arrival.arrival,
    })),
  };
}

function slimStation(s: Station) {
  return {
    id: s.id,
    name: s.name,
    lat: s.coordinate?.x,
    lon: s.coordinate?.y,
    distance: s.distance,
  };
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const transportTools = [
  {
    name: "search_stations",
    description: "Search for Swiss public transport stations/stops by name or coordinates",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Station name to search for" },
        x: { type: "number", description: "Longitude (WGS84)" },
        y: { type: "number", description: "Latitude (WGS84)" },
        type: { type: "string", description: "Filter: all, station, poi, address" },
      },
    },
  },
  {
    name: "get_connections",
    description: "Get train/bus connections between two Swiss locations",
    inputSchema: {
      type: "object",
      required: ["from", "to"],
      properties: {
        from: { type: "string", description: "Departure station/address" },
        to: { type: "string", description: "Arrival station/address" },
        date: { type: "string", description: "Date YYYY-MM-DD (default: today)" },
        time: { type: "string", description: "Time HH:MM (default: now)" },
        limit: { type: "number", description: "Number of connections (1-16, default: 4)" },
        isArrivalTime: { type: "boolean", description: "True if time is arrival time" },
      },
    },
  },
  {
    name: "get_departures",
    description: "Get live departures from a Swiss transport station",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Station name" },
        limit: { type: "number", description: "Number of departures (default: 10)" },
        datetime: { type: "string", description: "DateTime YYYY-MM-DDTHH:MM (default: now)" },
      },
    },
  },
  {
    name: "get_arrivals",
    description: "Get live arrivals at a Swiss transport station",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Station name" },
        limit: { type: "number", description: "Number of arrivals (default: 10)" },
        datetime: { type: "string", description: "DateTime YYYY-MM-DDTHH:MM (default: now)" },
      },
    },
  },
  {
    name: "get_nearby_stations",
    description: "Find Swiss public transport stations near given coordinates",
    inputSchema: {
      type: "object",
      required: ["x", "y"],
      properties: {
        x: { type: "number", description: "Longitude (WGS84)" },
        y: { type: "number", description: "Latitude (WGS84)" },
        limit: { type: "number", description: "Number of results (default: 10)" },
        distance: { type: "number", description: "Max distance in meters" },
      },
    },
  },
];

// ── Handler ─────────────────────────────────────────────────────────────────

export async function handleTransport(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_stations": {
      const url = buildUrl(`${BASE}/locations`, {
        query: args.query as string,
        x: args.x as number,
        y: args.y as number,
        type: args.type as string,
      });
      const data = await fetchJSON<{ stations: Station[] }>(url);
      return JSON.stringify(data.stations.map(slimStation));
    }

    case "get_connections": {
      const url = buildUrl(`${BASE}/connections`, {
        from: args.from as string,
        to: args.to as string,
        date: args.date as string,
        time: args.time as string,
        limit: args.limit as number,
        isArrivalTime: args.isArrivalTime ? 1 : undefined,
      });
      const data = await fetchJSON<{ connections: Connection[] }>(url);
      return JSON.stringify(data.connections.map(slimConnection));
    }

    case "get_departures": {
      const url = buildUrl(`${BASE}/stationboard`, {
        station: args.station as string,
        limit: args.limit as number,
        datetime: args.datetime as string,
        type: "departure",
      });
      const data = await fetchJSON<{ station: Station; stationboard: BoardEntry[] }>(url);
      return JSON.stringify({
        station: data.station?.name,
        departures: data.stationboard.map(slimBoardEntry),
      });
    }

    case "get_arrivals": {
      const url = buildUrl(`${BASE}/stationboard`, {
        station: args.station as string,
        limit: args.limit as number,
        datetime: args.datetime as string,
        type: "arrival",
      });
      const data = await fetchJSON<{ station: Station; stationboard: BoardEntry[] }>(url);
      return JSON.stringify({
        station: data.station?.name,
        arrivals: data.stationboard.map(slimBoardEntry),
      });
    }

    case "get_nearby_stations": {
      const url = buildUrl(`${BASE}/locations`, {
        x: args.x as number,
        y: args.y as number,
        type: "station",
      });
      const data = await fetchJSON<{ stations: Station[] }>(url);
      return JSON.stringify(data.stations.map(slimStation));
    }

    default:
      throw new Error(`Unknown transport tool: ${name}`);
  }
}
