import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch";

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

// Convert WGS84 to LV95 (Swiss projection) — approximate
function wgs84ToLV95(lat: number, lng: number): { x: number; y: number } {
  // Approx conversion for API calls that need Swiss coords
  const phiPrime = (lat * 3600 - 169028.66) / 10000;
  const lambdaPrime = (lng * 3600 - 26782.5) / 10000;
  const E = 2600072.37
    + 211455.93 * lambdaPrime
    - 10938.51 * lambdaPrime * phiPrime
    - 0.36 * lambdaPrime * phiPrime ** 2
    - 44.54 * lambdaPrime ** 3;
  const N = 1200147.07
    + 308807.95 * phiPrime
    + 3745.25 * lambdaPrime ** 2
    + 76.63 * phiPrime ** 2
    - 194.56 * lambdaPrime ** 2 * phiPrime
    + 119.79 * phiPrime ** 3;
  return { x: E, y: N };
}

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
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "reverse_geocode": {
      const lat = args.lat as number;
      const lng = args.lng as number;
      const { x, y } = wgs84ToLV95(lat, lng);
      const extent = `${x - 100},${y - 100},${x + 100},${y + 100}`;
      const url = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: `${lat},${lng}`,
        type: "locations",
        sr: 4326,
        limit: 5,
      });
      void extent; // extent used in identify, not reverse geocode search
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "get_solar_potential": {
      const lat = args.lat as number;
      const lng = args.lng as number;
      const extent = `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
      const url = buildUrl(`${BASE}/rest/services/all/MapServer/identify`, {
        geometry: `${lng},${lat}`,
        geometryType: "esriGeometryPoint",
        layers: "all:ch.bfe.solarenergie-eignung-daecher",
        mapExtent: extent,
        imageDisplay: "500,500,96",
        tolerance: 100,
        sr: 4326,
        returnGeometry: false,
      });
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "identify_location": {
      const lat = args.lat as number;
      const lng = args.lng as number;
      const extent = `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
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
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "get_municipality": {
      const url = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: args.name as string,
        type: "locations",
        sr: 4326,
        limit: 5,
      });
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown geodata tool: ${name}`);
  }
}
