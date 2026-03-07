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
    description: "Convert a Swiss address or place name to coordinates (swisstopo)",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: { type: "string", description: "Swiss address or place name" },
      },
    },
  },
  {
    name: "reverse_geocode",
    description: "Convert coordinates to a Swiss address (swisstopo)",
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
    description: "Search Swiss place names, localities, mountains, and geographic features",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Place name to search" },
        type: { type: "string", description: "Type filter: locations, featuresearch" },
      },
    },
  },
  {
    name: "get_solar_potential",
    description: "Get rooftop solar energy potential for a location in Switzerland",
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
    description: "Identify geographic features and data layers at a specific Swiss location",
    inputSchema: {
      type: "object",
      required: ["lat", "lng"],
      properties: {
        lat: { type: "number", description: "Latitude (WGS84)" },
        lng: { type: "number", description: "Longitude (WGS84)" },
        layers: { type: "string", description: "Comma-separated layer ids (default: all visible)" },
      },
    },
  },
  {
    name: "get_municipality",
    description: "Get information about a Swiss municipality by name",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Municipality name" },
      },
    },
  },
];

// ── Handler ─────────────────────────────────────────────────────────────────

export async function handleGeodata(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "geocode":
    case "search_places": {
      const url = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: args.address as string ?? args.query as string,
        type: args.type as string ?? "locations",
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
      const url = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: `${lat},${lng}`,
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
