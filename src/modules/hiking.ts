/**
 * Swiss Hiking Trail Closures module
 *
 * Data source: ASTRA / Schweizer Wanderwege via swisstopo geo.admin.ch
 * Layer: ch.astra.wanderland-sperrungen_umleitungen
 *
 * This module provides:
 *   - get_trail_closures: search current hiking trail closures by reason or type
 *   - get_trail_closures_nearby: find closures near a GPS coordinate
 *
 * No authentication required.
 */

import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch/rest/services/api/MapServer";
const LAYER = "ch.astra.wanderland-sperrungen_umleitungen";

// ── Types ────────────────────────────────────────────────────────────────────

interface ClosureAttributes {
  sperrungen_type?: string;
  sperrungen_type_en?: string;
  sperrungen_type_de?: string;
  reason_en?: string;
  reason_de?: string;
  duration_en?: string;
  title_en?: string;
  title_de?: string;
  abstract_en?: string;
  label?: string;
  route_nr?: string | null;
  segment_nr?: string | null;
}

interface FindResult {
  featureId: number;
  id: number;
  attributes: ClosureAttributes;
}

interface FindResponse {
  results: FindResult[];
}

interface SlimClosure {
  id: number;
  title: string;
  reason: string;
  duration: string;
  type: string;
  type_raw: string;
  description: string;
}

// ── Coordinate conversion (WGS84 → LV95) ────────────────────────────────────

export function wgs84ToLv95(lat: number, lon: number): [number, number] {
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
  return [e, n];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slimClosure(r: FindResult): SlimClosure {
  const a = r.attributes;
  return {
    id: r.featureId,
    title: a.title_en ?? a.title_de ?? "(untitled)",
    reason: a.reason_en ?? a.reason_de ?? "Unknown",
    duration: a.duration_en ?? "(no duration info)",
    type: a.sperrungen_type_en ?? a.sperrungen_type_de ?? a.sperrungen_type ?? "Unknown",
    type_raw: a.sperrungen_type ?? "",
    description: a.abstract_en ?? "",
  };
}

function filterByType(
  closures: SlimClosure[],
  type?: string
): SlimClosure[] {
  if (!type) return closures;
  const t = type.toLowerCase();
  if (t === "closure") {
    return closures.filter((c) => c.type_raw === "closed_way");
  }
  if (t === "detour") {
    return closures.filter((c) => c.type_raw === "detour");
  }
  return closures;
}

function deduplicate(closures: SlimClosure[]): SlimClosure[] {
  const seen = new Set<number>();
  return closures.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const hikingTools = [
  {
    name: "get_trail_closures",
    description:
      "Get current Swiss hiking trail closures and detours from the official ASTRA/Schweizer Wanderwege dataset. " +
      "Filter by closure reason (e.g. Steinschlag, Bauarbeiten, Hangrutsch) or type (closure, detour). " +
      "If no parameters are given, returns all active closures. " +
      "Data source: swisstopo ch.astra.wanderland-sperrungen_umleitungen.",
    inputSchema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Optional search term for closure reason (e.g. 'Steinschlag', 'Bauarbeiten', 'Hangrutsch', 'Hochwasser'). " +
            "Matches against the reason field (German or English). Case-insensitive partial match.",
        },
        type: {
          type: "string",
          enum: ["closure", "detour"],
          description: "Optional: filter by type — 'closure' (Sperrung) or 'detour' (Umleitung). If omitted, returns both.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Default: 20. Max: 100.",
        },
      },
    },
  },
  {
    name: "get_trail_closures_nearby",
    description:
      "Find Swiss hiking trail closures and detours near a given GPS coordinate. " +
      "Converts WGS84 coordinates to Swiss LV95 and queries the swisstopo identify endpoint. " +
      "Returns closures within the specified radius.",
    inputSchema: {
      type: "object",
      properties: {
        lat: {
          type: "number",
          description: "Latitude in WGS84 (e.g. 46.9480 for Bern).",
        },
        lon: {
          type: "number",
          description: "Longitude in WGS84 (e.g. 7.4474 for Bern).",
        },
        radius: {
          type: "number",
          description: "Search radius in metres. Default: 10000 (10 km). Max: 50000.",
        },
      },
      required: ["lat", "lon"],
    },
  },
];

// ── Handler: get_trail_closures ───────────────────────────────────────────────

async function handleGetTrailClosures(
  args: Record<string, unknown>
): Promise<string> {
  const reason = typeof args.reason === "string" ? args.reason.trim() : undefined;
  const typeFilter = typeof args.type === "string" ? args.type.trim() : undefined;
  const limit = Math.min(100, Math.max(1, Number(args.limit) || 20));

  let closures: SlimClosure[];

  if (reason) {
    // Search by reason — try reason_de field (primary) and also reason_en
    const [deResults, enResults] = await Promise.all([
      fetchJSON<FindResponse>(
        buildUrl(`${BASE}/find`, {
          layer: LAYER,
          searchText: reason,
          searchField: "reason_de",
          returnGeometry: false,
        })
      ),
      fetchJSON<FindResponse>(
        buildUrl(`${BASE}/find`, {
          layer: LAYER,
          searchText: reason,
          searchField: "reason_en",
          returnGeometry: false,
        })
      ),
    ]);
    const combined = [...(deResults.results ?? []), ...(enResults.results ?? [])];
    closures = deduplicate(combined.map(slimClosure));
  } else {
    // No reason filter — fetch all via sperrungen_type_de field with broad searches
    const [closureResults, detourResults] = await Promise.all([
      fetchJSON<FindResponse>(
        buildUrl(`${BASE}/find`, {
          layer: LAYER,
          searchText: "Sperrung",
          searchField: "sperrungen_type_de",
          returnGeometry: false,
        })
      ),
      fetchJSON<FindResponse>(
        buildUrl(`${BASE}/find`, {
          layer: LAYER,
          searchText: "detour",
          searchField: "sperrungen_type",
          returnGeometry: false,
        })
      ),
    ]);
    const combined = [...(closureResults.results ?? []), ...(detourResults.results ?? [])];
    closures = deduplicate(combined.map(slimClosure));
  }

  // Apply type filter
  closures = filterByType(closures, typeFilter);

  // Apply limit
  const total = closures.length;
  closures = closures.slice(0, limit);

  const result = {
    count: closures.length,
    total_found: total,
    filter: {
      reason: reason ?? null,
      type: typeFilter ?? null,
      limit,
    },
    source: "ASTRA / Schweizer Wanderwege (swisstopo ch.astra.wanderland-sperrungen_umleitungen)",
    closures,
  };

  const json = JSON.stringify(result);
  if (json.length > 49000) {
    // Trim descriptions to keep under 50K
    const trimmed = {
      ...result,
      closures: closures.map((c) => ({ ...c, description: c.description.slice(0, 100) })),
    };
    return JSON.stringify(trimmed);
  }
  return json;
}

// ── Handler: get_trail_closures_nearby ───────────────────────────────────────

async function handleGetTrailClosuresNearby(
  args: Record<string, unknown>
): Promise<string> {
  const lat = Number(args.lat);
  const lon = Number(args.lon);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error("lat and lon must be valid numbers");
  }
  if (lat < 45.0 || lat > 48.0 || lon < 5.5 || lon > 11.0) {
    throw new Error("Coordinates appear to be outside Switzerland (lat 45–48, lon 5.5–11)");
  }

  const radius = Math.min(50000, Math.max(1, Number(args.radius) || 10000));

  // Convert WGS84 → LV95
  const [e, n] = wgs84ToLv95(lat, lon);

  // Build map extent based on radius (approx 1 metre = 1 LV95 unit)
  const extent = `${e - radius},${n - radius},${e + radius},${n + radius}`;

  const url = buildUrl(`${BASE}/identify`, {
    layers: `all:${LAYER}`,
    geometry: `${e},${n}`,
    geometryType: "esriGeometryPoint",
    sr: 2056,
    tolerance: radius,
    imageDisplay: "1,1,100",
    mapExtent: extent,
    returnGeometry: false,
  });

  const data = await fetchJSON<FindResponse>(url);
  const closures = deduplicate((data.results ?? []).map(slimClosure));

  const result = {
    count: closures.length,
    query: {
      lat,
      lon,
      radius_m: radius,
      lv95_e: Math.round(e),
      lv95_n: Math.round(n),
    },
    source: "ASTRA / Schweizer Wanderwege (swisstopo ch.astra.wanderland-sperrungen_umleitungen)",
    closures,
  };

  const json = JSON.stringify(result);
  if (json.length > 49000) {
    const trimmed = {
      ...result,
      closures: closures.map((c) => ({ ...c, description: c.description.slice(0, 100) })),
    };
    return JSON.stringify(trimmed);
  }
  return json;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleHiking(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_trail_closures":
      return handleGetTrailClosures(args);
    case "get_trail_closures_nearby":
      return handleGetTrailClosuresNearby(args);
    default:
      throw new Error(`Unknown hiking tool: ${name}`);
  }
}
