/**
 * geo.admin map layer module
 *
 * Data source: swisstopo / geo.admin ech MapServer (no API key)
 * API: https://api3.geo.admin.ch/rest/services/ech/MapServer
 *
 * Provides:
 *   - search_map_layers: search or list layers in the ech catalogue
 *   - identify_map_layer: features at a WGS84 point
 *   - find_map_features: features matching an attribute value
 */

import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch/rest/services/ech/MapServer";
const SOURCE = "geo.admin.ch (ech MapServer)";

interface LayerAttributes {
  dataOwner?: string;
  abstract?: string;
  scaleLimit?: string;
}

interface CatalogLayer {
  layerBodId?: string;
  name?: string;
  fullName?: string;
  idGeoCat?: string;
  attributes?: LayerAttributes;
}

interface CatalogResponse {
  layers?: CatalogLayer[];
}

interface MapFeature {
  layerBodId?: string;
  layerName?: string;
  featureId?: string | number;
  attributes?: Record<string, unknown>;
}

interface FeatureResponse {
  results?: MapFeature[];
}

const LANGS = new Set(["en", "de", "fr", "it", "rm"]);

// ── Tool definitions ─────────────────────────────────────────────────────────

export const maplayerTools = [
  {
    name: "search_map_layers",
    description:
      "Search or list layers in the geo.admin ech MapServer catalogue (all federal geospatial layers). " +
      "Returns layer ids that identify_map_layer and find_map_features accept. " +
      "Without a query, returns the first page of layers alphabetically.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Words matched against the layer id, name, owner, and abstract (e.g. 'municipality', 'gemeinde', 'avalanche').",
        },
        owner: {
          type: "string",
          description: "Optional data-owner filter (e.g. swisstopo, BAFU, BFS).",
        },
        limit: {
          type: "number",
          description: "Maximum layers to return (default 15, max 40).",
        },
      },
    },
  },
  {
    name: "identify_map_layer",
    description:
      "Identify geo.admin features at a WGS84 point on one ech MapServer layer. " +
      "Use search_map_layers to find the layer id. Historical time-series layers keep only the current feature unless include_historical is true.",
    inputSchema: {
      type: "object",
      required: ["layer", "lat", "lng"],
      properties: {
        layer: {
          type: "string",
          description: "Layer id (e.g. ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill).",
        },
        lat: { type: "number", description: "Latitude in WGS84." },
        lng: { type: "number", description: "Longitude in WGS84." },
        tolerance: {
          type: "number",
          description: "Search tolerance in pixels (default 5, max 50). Use a higher value for lines and points.",
        },
        lang: {
          type: "string",
          description: "Label language: en (default), de, fr, it, or rm.",
        },
        include_historical: {
          type: "boolean",
          description: "Keep historical versions when a layer has an is_current_jahr attribute (default false).",
        },
        limit: {
          type: "number",
          description: "Maximum features (default 10, max 25).",
        },
      },
    },
  },
  {
    name: "find_map_features",
    description:
      "Find geo.admin features on one ech MapServer layer by an attribute value. " +
      "Identify a point first if you need the attribute names. " +
      "Example: layer ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill, search_field gemname, search_text Bern.",
    inputSchema: {
      type: "object",
      required: ["layer", "search_field", "search_text"],
      properties: {
        layer: {
          type: "string",
          description: "Layer id from search_map_layers.",
        },
        search_field: {
          type: "string",
          description: "Attribute name to search (e.g. gemname, name, label).",
        },
        search_text: {
          type: "string",
          description: "Value to search for.",
        },
        contains: {
          type: "boolean",
          description: "When true (default), match values that contain the text. When false, match the whole value.",
        },
        include_historical: {
          type: "boolean",
          description: "Keep historical versions when a layer has an is_current_jahr attribute (default false).",
        },
        limit: {
          type: "number",
          description: "Maximum features (default 10, max 25).",
        },
      },
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function requireLayer(value: unknown): string {
  const layer = requireText(value, "layer");
  if (layer.length > 200 || /[\s<>]/.test(layer)) {
    throw new Error("layer must be a geo.admin layer id");
  }
  return layer;
}

function requireCoordinate(value: unknown, label: string, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${label} must be a number between ${min} and ${max}`);
  }
  return n;
}

function flag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function language(value: unknown): string {
  if (typeof value !== "string") return "en";
  const lang = value.trim().toLowerCase();
  return LANGS.has(lang) ? lang : "en";
}

function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 1).trimEnd() + "…";
}

function slimAttributes(attributes: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!attributes) return {};
  const slim: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("link_")) continue;
    if (typeof value === "string" && value.length > 300) continue;
    slim[key] = value;
    if (Object.keys(slim).length >= 16) break;
  }
  return slim;
}

function selectFeatures(results: MapFeature[], includeHistorical: boolean, limit: number): { features: MapFeature[]; filteredToCurrent: boolean } {
  const current = results.filter((feature) => feature.attributes?.is_current_jahr === true);
  const filteredToCurrent = !includeHistorical && current.length > 0;
  const chosen = filteredToCurrent ? current : results;
  return { features: chosen.slice(0, limit), filteredToCurrent };
}

function slimFeature(feature: MapFeature) {
  return {
    layer_id: feature.layerBodId ?? "",
    layer_name: feature.layerName ?? "",
    feature_id: feature.featureId ?? null,
    attributes: slimAttributes(feature.attributes),
  };
}

function layerHaystack(layer: CatalogLayer): string {
  const attributes = layer.attributes ?? {};
  return [layer.layerBodId, layer.name, layer.fullName, attributes.dataOwner, attributes.abstract]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleSearchLayers(args: Record<string, unknown>): Promise<string> {
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  const owner = typeof args.owner === "string" ? args.owner.trim().toLowerCase() : "";
  const limit = clampNumber(args.limit, 15, 1, 40);
  const tokens = query.split(/\s+/).filter(Boolean);

  const data = await fetchJSON<CatalogResponse>(buildUrl(BASE, {}));
  const layers = data.layers ?? [];
  const matched = layers
    .filter((layer) => Boolean(layer.layerBodId))
    .filter((layer) => {
      const haystack = layerHaystack(layer);
      if (owner && !(layer.attributes?.dataOwner ?? "").toLowerCase().includes(owner)) return false;
      return tokens.every((token) => haystack.includes(token));
    })
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "") || (a.layerBodId ?? "").localeCompare(b.layerBodId ?? ""));

  const results = matched.slice(0, limit).map((layer) => ({
    layer_id: layer.layerBodId,
    name: layer.name ?? "",
    full_name: layer.fullName ?? "",
    owner: layer.attributes?.dataOwner ?? "",
    scale_limit: layer.attributes?.scaleLimit ?? "",
    abstract: truncate(layer.attributes?.abstract ?? "", 220),
    geocat_id: layer.idGeoCat || undefined,
  }));

  return JSON.stringify({
    ...(query ? { query } : {}),
    ...(owner ? { owner } : {}),
    total_matches: matched.length,
    returned: results.length,
    layers: results,
    source: SOURCE,
  });
}

async function handleIdentify(args: Record<string, unknown>): Promise<string> {
  const layer = requireLayer(args.layer);
  const lat = requireCoordinate(args.lat, "lat", -90, 90);
  const lng = requireCoordinate(args.lng, "lng", -180, 180);
  const tolerance = clampNumber(args.tolerance, 5, 0, 50);
  const limit = clampNumber(args.limit, 10, 1, 25);
  const includeHistorical = flag(args.include_historical, false);
  const pad = 0.02;
  const url = buildUrl(`${BASE}/identify`, {
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    layers: `all:${layer}`,
    mapExtent: `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`,
    imageDisplay: "500,500,96",
    tolerance,
    sr: 4326,
    returnGeometry: false,
    lang: language(args.lang),
  });

  const data = await fetchJSON<FeatureResponse>(url);
  const raw = data.results ?? [];
  const { features, filteredToCurrent } = selectFeatures(raw, includeHistorical, limit);

  return JSON.stringify({
    layer,
    lat,
    lng,
    total_matches: raw.length,
    returned: features.length,
    ...(filteredToCurrent ? { current_only: true } : {}),
    results: features.map(slimFeature),
    source: SOURCE,
  });
}

async function handleFind(args: Record<string, unknown>): Promise<string> {
  const layer = requireLayer(args.layer);
  const searchField = requireText(args.search_field, "search_field");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(searchField)) {
    throw new Error("search_field must be an attribute name such as gemname");
  }
  const searchText = requireText(args.search_text, "search_text");
  const contains = flag(args.contains, true);
  const includeHistorical = flag(args.include_historical, false);
  const limit = clampNumber(args.limit, 10, 1, 25);

  const url = buildUrl(`${BASE}/find`, {
    layer,
    searchField,
    searchText,
    contains,
    returnGeometry: false,
    sr: 4326,
  });
  const data = await fetchJSON<FeatureResponse>(url);
  const raw = data.results ?? [];
  const { features, filteredToCurrent } = selectFeatures(raw, includeHistorical, limit);

  return JSON.stringify({
    layer,
    search_field: searchField,
    search_text: searchText,
    contains,
    total_matches: raw.length,
    returned: features.length,
    ...(filteredToCurrent ? { current_only: true } : {}),
    results: features.map(slimFeature),
    source: SOURCE,
  });
}

export async function handleMaplayers(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_map_layers":
      return handleSearchLayers(args);
    case "identify_map_layer":
      return handleIdentify(args);
    case "find_map_features":
      return handleFind(args);
    default:
      throw new Error(`Unknown map layer tool: ${name}`);
  }
}
