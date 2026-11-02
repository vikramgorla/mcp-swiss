import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch";

// ── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  id: number;
  weight: number;
  attrs: Record<string, unknown>;
}

interface SearchResponse {
  results: SearchResult[];
}

interface SolarAttributes {
  building_id: number;
  klasse: number;
  klasse_text: string;
  flaeche: number;
  ausrichtung: string;
  neigung: number;
  stromertrag: number;
  stromertrag_winterhalbjahr: number;
  stromertrag_sommerhalbjahr: number;
  finanzertrag: number;
  gstrahlung: number;
  gwr_egid: number;
  df_nummer: number;
  label: string;
}

interface IdentifyResult {
  layerBodId: string;
  layerName: string;
  featureId: number;
  id: number;
  attributes: Record<string, unknown>;
}

interface IdentifyResponse {
  results: IdentifyResult[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function slimSearchResult(r: SearchResult) {
  const a = r.attrs;
  return {
    label: a.label,
    lat: a.lat,
    lon: a.lon,
    type: a.origin,
    detail: a.detail,
  };
}

function slimSolarResult(r: IdentifyResult) {
  const a = r.attributes as unknown as SolarAttributes;
  return {
    buildingId: a.building_id,
    roofSurface: a.df_nummer,
    class: a.klasse,
    classText: a.klasse_text,
    area_m2: a.flaeche,
    orientation: a.ausrichtung,
    tilt_deg: a.neigung,
    electricityYield_kWh: a.stromertrag,
    winterYield_kWh: a.stromertrag_winterhalbjahr,
    summerYield_kWh: a.stromertrag_sommerhalbjahr,
    financialReturn_CHF: a.finanzertrag,
    radiation_kWh_m2: a.gstrahlung,
    egid: a.gwr_egid,
    label: a.label,
  };
}

function slimIdentifyResult(r: IdentifyResult) {
  return {
    layer: r.layerName,
    layerId: r.layerBodId,
    id: r.featureId,
    attributes: r.attributes,
  };
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const geodataTools = [
  {
    name: "geocode",
    description: "Address or place name to WGS84 coordinates (swisstopo)",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: { type: "string" },
      },
    },
  },
  {
    name: "reverse_geocode",
    description: "WGS84 coordinates to address (swisstopo)",
    inputSchema: {
      type: "object",
      required: ["lat", "lng"],
      properties: {
        lat: { type: "number", description: "Latitude (WGS84)" },
        lng: { type: "number", description: "Longitude (WGS84)" },
      },
    },
  },
  {
    name: "search_places",
    description: "Search place names, localities, mountains, geographic features",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
      },
    },
  },
  {
    name: "get_solar_potential",
    description: "Rooftop solar potential at a location",
    inputSchema: {
      type: "object",
      required: ["lat", "lng"],
      properties: {
        lat: { type: "number", description: "Latitude (WGS84)" },
        lng: { type: "number", description: "Longitude (WGS84)" },
      },
    },
  },
  {
    name: "identify_location",
    description: "Geographic features and swisstopo data layers at a location",
    inputSchema: {
      type: "object",
      required: ["lat", "lng"],
      properties: {
        lat: { type: "number", description: "Latitude (WGS84)" },
        lng: { type: "number", description: "Longitude (WGS84)" },
        layers: { type: "string", description: "Comma-separated layer IDs (default: all)" },
      },
    },
  },
  {
    name: "get_municipality",
    description: "Municipality info by name",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    },
  },
];

// ── Handler ─────────────────────────────────────────────────────────────────

// ── Reverse geocoding ────────────────────────────────────────────────────────
// SearchServer has no reverse lookup (a "lat,lng" searchText returns nothing),
// so resolve the point against the address register and the municipality layer.

const ADDRESS_LAYER = "ch.bfs.gebaeude_wohnungs_register";
const MUNICIPALITY_LAYER = "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill";

interface IdentifyFeature<T> {
  attributes: T;
  geometry?: { x: number; y: number };
}

interface AddressAttributes {
  strname_deinr?: string | null;
  dplz4?: number | null;
  dplzname?: string | null;
  ggdename?: string | null;
  gdekt?: string | null;
  egid?: string | number | null;
}

interface MunicipalityAttributes {
  gemname?: string | null;
  kanton?: string | null;
  gde_nr?: number | null;
}

function metresBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * identify() on a WGS84 envelope. A point geometry needs a matching mapExtent
 * to hit-test reliably, so every lookup here uses a small box instead.
 */
async function identify<T>(
  layer: string,
  envelope: string,
  returnGeometry: boolean
): Promise<Array<IdentifyFeature<T>>> {
  const res = await fetchJSON<{ results?: Array<IdentifyFeature<T>> }>(
    buildUrl(`${BASE}/rest/services/api/MapServer/identify`, {
      layers: `all:${layer}`,
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
      sr: 4326,
      tolerance: 0,
      returnGeometry,
    })
  );
  return res.results ?? [];
}

/** WGS84 envelope of `radius` metres around a point. */
function envelopeAround(lat: number, lng: number, radius: number): string {
  const dLat = radius / 111320;
  const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLon, lat - dLat, lng + dLon, lat + dLat]
    .map((v) => Number(v.toFixed(6)))
    .join(",");
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const radius = 150;
  const [addresses, municipalities] = await Promise.all([
    identify<AddressAttributes>(ADDRESS_LAYER, envelopeAround(lat, lng, radius), true).catch(() => []),
    identify<MunicipalityAttributes>(MUNICIPALITY_LAYER, envelopeAround(lat, lng, 10), false).catch(() => []),
  ]);

  let nearest: { a: AddressAttributes; dist: number } | undefined;
  for (const f of addresses) {
    if (!f.geometry) continue;
    const dist = metresBetween(lat, lng, f.geometry.y, f.geometry.x);
    if (!nearest || dist < nearest.dist) nearest = { a: f.attributes, dist };
  }

  const muni = municipalities[0]?.attributes;
  const a = nearest?.a;
  return JSON.stringify({
    lat,
    lng,
    address: a?.strname_deinr ?? null,
    postcode: a?.dplz4 ?? null,
    locality: a?.dplzname ?? null,
    municipality: muni?.gemname ?? a?.ggdename ?? null,
    bfs_municipality_number: muni?.gde_nr ?? null,
    canton: muni?.kanton ?? a?.gdekt ?? null,
    egid: a?.egid ?? null,
    address_distance_m: nearest ? Math.round(nearest.dist) : null,
    note: nearest ? undefined : `No address within ${radius} m; only the municipality was resolved.`,
    source: "swisstopo / BFS building register (api3.geo.admin.ch)",
  });
}

export async function handleGeodata(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "geocode":
    case "search_places": {
      const url = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: args.address as string ?? args.query as string,
        type: "locations",
        sr: 4326,
        limit: 10,
      });
      const data = await fetchJSON<SearchResponse>(url);
      return JSON.stringify({
        count: data.results.length,
        results: data.results.map(slimSearchResult),
      });
    }

    case "reverse_geocode": {
      const lat = args.lat as number;
      const lng = args.lng as number;
      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error("lat and lng are required (WGS84)");
      }
      return reverseGeocode(lat, lng);
    }

    case "get_solar_potential": {
      const lat = args.lat as number;
      const lng = args.lng as number;
      // Use tight tolerance to get only the closest building
      const extent = `${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}`;
      const url = buildUrl(`${BASE}/rest/services/all/MapServer/identify`, {
        geometry: `${lng},${lat}`,
        geometryType: "esriGeometryPoint",
        layers: "all:ch.bfe.solarenergie-eignung-daecher",
        mapExtent: extent,
        imageDisplay: "500,500,96",
        tolerance: 10,
        sr: 4326,
        returnGeometry: false,
      });
      const data = await fetchJSON<IdentifyResponse>(url);
      const roofs = data.results.map(slimSolarResult);

      // Group by building and summarize
      const buildingMap = new Map<number, typeof roofs>();
      for (const r of roofs) {
        const id = r.buildingId;
        if (!buildingMap.has(id)) buildingMap.set(id, []);
        buildingMap.get(id)!.push(r);
      }

      const buildings = [...buildingMap.entries()].map(([buildingId, surfaces]) => ({
        buildingId,
        totalArea_m2: Math.round(surfaces.reduce((s, r) => s + (r.area_m2 ?? 0), 0)),
        totalElectricity_kWh: Math.round(surfaces.reduce((s, r) => s + (r.electricityYield_kWh ?? 0), 0)),
        totalFinancialReturn_CHF: Math.round(surfaces.reduce((s, r) => s + (r.financialReturn_CHF ?? 0), 0)),
        roofSurfaces: surfaces.length,
        bestClass: Math.min(...surfaces.map((r) => r.class).filter((c) => c != null)),
        surfaces: surfaces.slice(0, 5), // Cap at 5 surfaces per building
      }));

      return JSON.stringify({
        count: buildings.length,
        buildings: buildings.slice(0, 10), // Cap at 10 buildings
        source: "Swiss Federal Office of Energy (BFE)",
      });
    }

    case "identify_location": {
      const lat = args.lat as number;
      const lng = args.lng as number;
      const extent = `${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}`;
      const layers = args.layers ? `all:${args.layers}` : "all";
      const url = buildUrl(`${BASE}/rest/services/all/MapServer/identify`, {
        geometry: `${lng},${lat}`,
        geometryType: "esriGeometryPoint",
        layers,
        mapExtent: extent,
        imageDisplay: "500,500,96",
        tolerance: 5,
        sr: 4326,
        returnGeometry: false,
      });
      const data = await fetchJSON<IdentifyResponse>(url);
      return JSON.stringify({
        count: data.results.length,
        results: data.results.slice(0, 20).map(slimIdentifyResult),
      });
    }

    case "get_municipality": {
      const url = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: args.name as string,
        type: "locations",
        sr: 4326,
        limit: 5,
      });
      const data = await fetchJSON<SearchResponse>(url);
      return JSON.stringify({
        count: data.results.length,
        results: data.results.map(slimSearchResult),
      });
    }

    default:
      throw new Error(`Unknown geodata tool: ${name}`);
  }
}
