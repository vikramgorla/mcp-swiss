import { fetchJSON, buildUrl } from "../utils/http.js";

const GEO_ADMIN = "https://api3.geo.admin.ch/rest/services/api/MapServer";
const TRAFFIC_LAYER = "ch.astra.strassenverkehrszaehlung-uebergeordnet";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrafficAttributes {
  mlocname: string;
  mlocnr?: string | number;
  canton?: string;
  streetdesignation?: string;
  targetlocation1?: string;
  targetlocation2?: string;
  numberoflanes1?: number;
  numberoflanes2?: number;
  locationlv95?: string;
  de_networktype?: string;
  year?: number | null;
  dtv?: number | null;
  dwv?: number | null;
  prctheavytraffic?: number | null;
  prctheavytrafficday?: number | null;
  prctheavytrafficnight?: number | null;
  label?: string;
}

interface TrafficFeature {
  layerBodId: string;
  layerName: string;
  featureId: number;
  id: number;
  attributes: TrafficAttributes;
}

interface FindResponse {
  results: TrafficFeature[];
}

interface IdentifyResponse {
  results: TrafficFeature[];
}

// ── LV95 coordinate conversion ────────────────────────────────────────────────

function wgs84ToLv95(lat: number, lon: number): [number, number] {
  const latAux = (lat * 3600 - 169028.66) / 10000;
  const lonAux = (lon * 3600 - 26782.5) / 10000;
  const e =
    2600072.37 +
    211455.93 * lonAux -
    10938.51 * lonAux * latAux -
    0.36 * lonAux * latAux * latAux -
    44.54 * lonAux * lonAux * lonAux;
  const n =
    1200147.07 +
    308807.95 * latAux +
    3745.25 * lonAux * lonAux +
    76.63 * latAux * latAux -
    194.56 * lonAux * lonAux * latAux +
    119.79 * latAux * latAux * latAux;
  return [Math.round(e), Math.round(n)];
}

// ── Slim result helpers ───────────────────────────────────────────────────────

function slimTrafficStation(f: TrafficFeature) {
  const a = f.attributes;
  return {
    id: f.featureId,
    name: a.mlocname,
    canton: a.canton ?? null,
    road: a.streetdesignation ?? null,
    direction1: a.targetlocation1 ?? null,
    direction2: a.targetlocation2 ?? null,
    year: a.year ?? null,
    avgDailyTraffic: a.dtv ?? null,
    avgWeekdayTraffic: a.dwv ?? null,
    heavyTrafficPct: a.prctheavytraffic != null ? Math.round(a.prctheavytraffic * 10) / 10 : null,
    networkType: a.de_networktype ?? null,
  };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const trafficTools = [
  {
    name: "get_traffic_count",
    description:
      "Get traffic volume at an ASTRA counting station in Switzerland by location name (e.g. 'Gotthard', 'Zürich', 'Genf'). Returns daily and weekday traffic counts, heavy vehicle percentage, and measurement year.",
    inputSchema: {
      type: "object",
      required: ["location"],
      properties: {
        location: {
          type: "string",
          description: "Station or location name to search (e.g. 'Gotthard', 'Zürich', 'Basel')",
        },
      },
    },
  },
  {
    name: "get_traffic_by_canton",
    description:
      "List ASTRA traffic counting stations in a Swiss canton. Returns up to 20 stations with traffic data.",
    inputSchema: {
      type: "object",
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description: "2-letter canton code (e.g. 'ZH', 'BE', 'GE', 'VS')",
        },
      },
    },
  },
  {
    name: "get_traffic_nearby",
    description:
      "Find ASTRA traffic counting stations near a geographic coordinate in Switzerland. Returns nearby stations with traffic volume data.",
    inputSchema: {
      type: "object",
      required: ["lat", "lon"],
      properties: {
        lat: {
          type: "number",
          description: "Latitude in WGS84 (e.g. 47.3769 for Zürich)",
        },
        lon: {
          type: "number",
          description: "Longitude in WGS84 (e.g. 8.5417 for Zürich)",
        },
        radius: {
          type: "number",
          description: "Search radius in meters (default: 5000)",
        },
      },
    },
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleTraffic(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_traffic_count": {
      const location = args.location as string;
      const url = buildUrl(`${GEO_ADMIN}/find`, {
        layer: TRAFFIC_LAYER,
        searchText: location,
        searchField: "mlocname",
        returnGeometry: false,
      });
      const data = await fetchJSON<FindResponse>(url);
      const stations = data.results.map(slimTrafficStation);
      return JSON.stringify({
        count: stations.length,
        query: location,
        stations,
        source: "ASTRA — Federal Roads Office (Bundesamt für Strassen)",
      });
    }

    case "get_traffic_by_canton": {
      const canton = (args.canton as string).toUpperCase();
      const url = buildUrl(`${GEO_ADMIN}/find`, {
        layer: TRAFFIC_LAYER,
        searchText: canton,
        searchField: "canton",
        returnGeometry: false,
      });
      const data = await fetchJSON<FindResponse>(url);
      const stations = data.results.slice(0, 20).map(slimTrafficStation);
      return JSON.stringify({
        count: stations.length,
        total: data.results.length,
        canton,
        stations,
        source: "ASTRA — Federal Roads Office (Bundesamt für Strassen)",
      });
    }

    case "get_traffic_nearby": {
      const lat = args.lat as number;
      const lon = args.lon as number;
      const radius = (args.radius as number | undefined) ?? 5000;

      const [e, n] = wgs84ToLv95(lat, lon);

      // Build a map extent around the point using the radius
      const extentPadding = radius * 3;
      const mapExtent = `${e - extentPadding},${n - extentPadding},${e + extentPadding},${n + extentPadding}`;

      const url = buildUrl(`${GEO_ADMIN}/identify`, {
        geometry: `${e},${n}`,
        geometryType: "esriGeometryPoint",
        tolerance: radius,
        mapExtent,
        imageDisplay: "1,1,96",
        layers: `all:${TRAFFIC_LAYER}`,
        returnGeometry: false,
      });
      const data = await fetchJSON<IdentifyResponse>(url);
      const stations = data.results.map(slimTrafficStation);
      return JSON.stringify({
        count: stations.length,
        lat,
        lon,
        radius_m: radius,
        stations,
        source: "ASTRA — Federal Roads Office (Bundesamt für Strassen)",
      });
    }

    default:
      throw new Error(`Unknown traffic tool: ${name}`);
  }
}
