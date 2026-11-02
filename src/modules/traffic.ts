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
  /** LV95 point, present when the request asks for geometry. */
  geometry?: { x: number; y: number };
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
      "ASTRA traffic counting station volumes by location name",
    inputSchema: {
      type: "object",
      required: ["location"],
      properties: {
        location: {
          type: "string",
          description: "e.g. Gotthard",
        },
      },
    },
  },
  {
    name: "get_traffic_by_canton",
    description:
      "ASTRA traffic counting stations in a canton (max 20)",
    inputSchema: {
      type: "object",
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description: "Canton code, e.g. ZH",
        },
      },
    },
  },
  {
    name: "get_traffic_nearby",
    description:
      "ASTRA traffic counting stations near a WGS84 point",
    inputSchema: {
      type: "object",
      required: ["lat", "lon"],
      properties: {
        lat: {
          type: "number",
          description: "Latitude (WGS84)",
        },
        lon: {
          type: "number",
          description: "Longitude (WGS84)",
        },
        radius: {
          type: "number",
          description: "Metres",
          default: 5000,
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
      const radius = Math.min(50000, Math.max(1, Number(args.radius) || 5000));

      const [e, n] = wgs84ToLv95(lat, lon);

      // An LV95 box around the point, then filter by true distance. Passing the
      // radius as `tolerance` made this a nationwide search: tolerance counts
      // screen pixels, and the 1x1 px display made every pixel the whole extent.
      const bbox = `${e - radius},${n - radius},${e + radius},${n + radius}`;

      const url = buildUrl(`${GEO_ADMIN}/identify`, {
        geometry: bbox,
        geometryType: "esriGeometryEnvelope",
        sr: 2056,
        tolerance: 0,
        layers: `all:${TRAFFIC_LAYER}`,
        returnGeometry: true,
      });
      const data = await fetchJSON<IdentifyResponse>(url);
      const stations = data.results
        .map((f) => {
          const g = f.geometry;
          const dist = g ? Math.hypot(g.x - e, g.y - n) : Number.POSITIVE_INFINITY;
          return { ...slimTrafficStation(f), distance_m: Math.round(dist) };
        })
        .filter((s) => s.distance_m <= radius)
        .sort((a, b) => a.distance_m - b.distance_m);

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
