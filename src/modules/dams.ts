// Swiss Dams & Reservoirs module — powered by Federal Office of Energy (SFOE) via swisstopo BGDI
// Data source: https://api3.geo.admin.ch — layer ch.bfe.stauanlagen-bundesaufsicht
// All dams under federal supervision in Switzerland. No auth required.

import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch/rest/services/api/MapServer";
const DAMS_LAYER = "ch.bfe.stauanlagen-bundesaufsicht";
const CANTON_LAYER = "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill";
const MAX_RESULTS = 20;
const MAX_LIMIT = 100;

// ── Types ────────────────────────────────────────────────────────────────────

interface DamAttributes {
  damname: string;
  damtype_de: string;
  damtype_en: string;
  damtype_fr: string;
  damheight: number | null;
  crestlevel: number | null;
  crestlength: number | null;
  facilityname: string;
  reservoirname: string;
  impoundmentvolume: string | null;
  impoundmentlevel: number | null;
  storagelevel: number | null;
  facaim_de: string;
  facaim_en: string;
  facaim_fr: string;
  beginningofoperation: string | null;
  startsupervision: string | null;
  baujahr: number | null;
  has_picture: number | null;
  facility_stabil_id: number | null;
  label: string;
}

interface DamFindResult {
  featureId: number;
  id: number;
  layerBodId: string;
  layerName: string;
  bbox: [number, number, number, number];
  geometry?: {
    x: number;
    y: number;
    spatialReference?: { wkid: number };
  };
  attributes: DamAttributes;
}

interface DamFindResponse {
  results: DamFindResult[];
}

interface CantonFindResult {
  featureId: number;
  id: number;
  bbox: [number, number, number, number];
  attributes: {
    ak: string;
    name: string;
    flaeche: number;
    label: string;
  };
}

interface CantonFindResponse {
  results: CantonFindResult[];
}

interface CantonIdentifyResult {
  layerBodId: string;
  featureId: number;
  attributes: {
    ak: string;
    name: string;
    flaeche: number;
    label: string;
  };
}

interface CantonIdentifyResponse {
  results: CantonIdentifyResult[];
}

/** Canton of a dam: point-in-polygon, or nearest within BORDER_TOLERANCE_M. */
interface DamCanton {
  code: string | null;
  /** true when the dam point lies outside every canton polygon (Rhine border plants). */
  approx?: boolean;
}

// ── Caches ───────────────────────────────────────────────────────────────────

/** The layer holds a couple of hundred dams; fetching it once per process keeps canton lookups cheap. */
let allDamsCache: DamFindResult[] | null = null;
const cantonByFeature = new Map<number, DamCanton>();

export function clearDamsCache(): void {
  allDamsCache = null;
  cantonByFeature.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract year from ISO date string like "1961-01-01" */
function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/** Format a dam result for search/list output (compact) */
function formatDamSummary(dam: DamFindResult, canton?: DamCanton | null): Record<string, unknown> {
  const a = dam.attributes;
  return {
    dam_name: a.damname,
    dam_type: a.damtype_en ?? a.damtype_de,
    height_m: a.damheight,
    crest_length_m: a.crestlength,
    facility: a.facilityname,
    reservoir: a.reservoirname,
    volume_million_m3: a.impoundmentvolume ? parseFloat(a.impoundmentvolume) : null,
    purpose: a.facaim_en ?? a.facaim_de,
    canton: canton?.code ?? null,
    canton_on_national_border: canton?.approx ? true : undefined,
    year_built: a.baujahr ?? extractYear(a.beginningofoperation),
  };
}

/** Format a dam result for full detail output */
function formatDamDetail(dam: DamFindResult, canton?: DamCanton | null): Record<string, unknown> {
  const a = dam.attributes;
  return {
    dam_name: a.damname,
    dam_type: {
      english: a.damtype_en,
      german: a.damtype_de,
      french: a.damtype_fr,
    },
    height_m: a.damheight,
    crest_length_m: a.crestlength,
    crest_level_masl: a.crestlevel,
    facility_name: a.facilityname,
    reservoir: {
      name: a.reservoirname,
      volume_million_m3: a.impoundmentvolume ? parseFloat(a.impoundmentvolume) : null,
      impoundment_level_masl: a.impoundmentlevel,
      storage_level_masl: a.storagelevel,
    },
    purpose: {
      english: a.facaim_en,
      german: a.facaim_de,
      french: a.facaim_fr,
    },
    operation: {
      year_built: a.baujahr ?? extractYear(a.beginningofoperation),
      beginning_of_operation: a.beginningofoperation,
      start_of_federal_supervision: a.startsupervision,
    },
    canton: canton?.code ?? null,
    canton_on_national_border: canton?.approx ? true : undefined,
    feature_id: dam.featureId,
  };
}

/** Half-width of the identify window, in metres; with imageDisplay below it is 1 m per pixel. */
const IDENTIFY_WINDOW_M = 1000;
/** Plants on the Rhine sit a few metres outside every canton polygon. */
const BORDER_TOLERANCE_M = 300;

function cantonIdentifyUrl(x: number, y: number, toleranceM: number): string {
  return buildUrl(`${BASE}/identify`, {
    geometry: `${x},${y}`,
    geometryType: "esriGeometryPoint",
    layers: `all:${CANTON_LAYER}`,
    mapExtent: `${x - IDENTIFY_WINDOW_M},${y - IDENTIFY_WINDOW_M},${x + IDENTIFY_WINDOW_M},${y + IDENTIFY_WINDOW_M}`,
    imageDisplay: `${IDENTIFY_WINDOW_M * 2},${IDENTIFY_WINDOW_M * 2},96`,
    tolerance: toleranceM,
    sr: 2056,
    returnGeometry: false,
  });
}

/**
 * Canton for an LV95 point, from the swissboundaries3d canton polygons.
 * Exact hit first; only if the point is outside Switzerland's polygons (dams shared
 * with Germany) do we accept the canton within BORDER_TOLERANCE_M, flagged as such.
 */
async function fetchCantonForCoords(x: number, y: number): Promise<DamCanton> {
  const exact = await fetchJSON<CantonIdentifyResponse>(cantonIdentifyUrl(x, y, 0));
  const hit = exact.results?.[0]?.attributes?.ak;
  if (hit) return { code: hit };

  const near = await fetchJSON<CantonIdentifyResponse>(cantonIdentifyUrl(x, y, BORDER_TOLERANCE_M));
  const codes = new Set((near.results ?? []).map((r) => r.attributes.ak));
  // Ambiguous (two cantons within tolerance) means we cannot verify one — say so.
  if (codes.size !== 1) return { code: null };
  return { code: [...codes][0], approx: true };
}

/** Canton for a dam, memoised per feature for the lifetime of the process. */
async function cantonForDam(dam: DamFindResult): Promise<DamCanton> {
  const x = dam.geometry?.x;
  const y = dam.geometry?.y;
  if (x == null || y == null) return { code: null };

  const cached = cantonByFeature.get(dam.featureId);
  if (cached) return cached;

  const canton = await fetchCantonForCoords(x, y).catch(() => ({ code: null }) as DamCanton);
  if (canton.code) cantonByFeature.set(dam.featureId, canton);
  return canton;
}

/** Resolve cantons for many dams without hammering the identify endpoint. */
async function cantonsForDams(dams: DamFindResult[], concurrency = 8): Promise<DamCanton[]> {
  const out: DamCanton[] = new Array<DamCanton>(dams.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (let i = next++; i < dams.length; i = next++) {
      out[i] = await cantonForDam(dams[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, dams.length) }, worker));
  return out;
}

/** Fetch canton polygon bbox (LV95) by 2-letter canton code */
async function fetchCantonBbox(cantonCode: string): Promise<[number, number, number, number] | null> {
  const url = buildUrl(`${BASE}/find`, {
    layer: CANTON_LAYER,
    searchText: cantonCode.toUpperCase(),
    searchField: "ak",
    returnGeometry: true,
    sr: 2056,
  });
  const data = await fetchJSON<CantonFindResponse>(url);
  return data.results?.[0]?.bbox ?? null;
}

/** Fetch all dams matching searchText in a given field */
async function findDams(searchText: string, searchField: string, withGeometry = false): Promise<DamFindResult[]> {
  const url = buildUrl(`${BASE}/find`, {
    layer: DAMS_LAYER,
    searchText,
    searchField,
    returnGeometry: withGeometry ? "true" : "false",
    sr: 2056,
  });
  const data = await fetchJSON<DamFindResponse>(url);
  return data.results ?? [];
}

/** api3 never returns more than this many features in one response, whatever the endpoint. */
const PAGE_SIZE = 201;
/** Stops the paging loop if the endpoint ever ignores `offset`. */
const MAX_PAGES = 25;
/** Switzerland in LV95, padded well past the national border. */
const CH_EXTENT = "2450000,1050000,2870000,1320000";

function damsIdentifyUrl(offset: number): string {
  return buildUrl(`${BASE}/identify`, {
    geometry: CH_EXTENT,
    geometryType: "esriGeometryEnvelope",
    layers: `all:${DAMS_LAYER}`,
    mapExtent: CH_EXTENT,
    imageDisplay: "100,100,96",
    tolerance: 0,
    sr: 2056,
    returnGeometry: true,
    offset,
  });
}

/**
 * Every dam in the layer, with geometry. Cached for the lifetime of the process.
 *
 * `find` is no good here: it stops at 201 rows sorted by name and the layer has more,
 * so everything from "Le Chalet" onwards fell off the list. `identify` over a
 * Switzerland-wide envelope honours `offset`, so page it and merge by feature id.
 * Pages overlap by one row, so a row cannot slip through a page boundary.
 */
async function loadAllDams(): Promise<DamFindResult[]> {
  if (allDamsCache) return allDamsCache;

  const byId = new Map<number, DamFindResult>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchJSON<DamFindResponse>(damsIdentifyUrl(page * (PAGE_SIZE - 1)), {
      timeoutMs: 60_000,
    });
    const results = data.results ?? [];
    for (const dam of results) byId.set(dam.featureId, dam);
    if (results.length < PAGE_SIZE) break;
  }

  allDamsCache = [...byId.values()];
  return allDamsCache;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const damsTools = [
  {
    name: "search_dams",
    description:
      "Search federally supervised dams by dam or reservoir name (SFOE)",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "Partial name, e.g. Grimsel, Lac des Dix",
        },
      },
    },
  },
  {
    name: "get_dams_by_canton",
    description:
      "Federally supervised dams in a canton",
    inputSchema: {
      type: "object",
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description:
            "Canton code, e.g. VS",
        },
        limit: {
          type: "number",
          description: "Dams to return (1-100)",
          default: 20,
        },
      },
    },
  },
  {
    name: "get_dam_details",
    description:
      "Full technical details of one dam by name",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "e.g. Grande Dixence (see search_dams)",
        },
      },
    },
  },
];

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function handleDams(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_dams": {
      const query = args.query as string;
      if (!query?.trim()) {
        throw new Error("query is required");
      }

      // Geometry is required here: the canton comes from the dam's coordinates.
      let results = await findDams(query, "damname", true);
      if (!results.length) {
        results = await findDams(query, "reservoirname", true);
      }

      if (!results.length) {
        return JSON.stringify({
          results: [],
          count: 0,
          message: `No dams found matching "${query}". Try a shorter search term or reservoir name.`,
          source: `${BASE}/find?layer=${DAMS_LAYER}`,
        }, null, 2);
      }

      const shown = results.slice(0, MAX_RESULTS);
      const cantons = await cantonsForDams(shown);
      const enriched = shown.map((dam, i) => formatDamSummary(dam, cantons[i]));

      const response = {
        results: enriched,
        count: enriched.length,
        total_found: results.length,
        source: `${BASE}/find?layer=${DAMS_LAYER}`,
      };

      const json = JSON.stringify(response, null, 2);
      if (json.length > 49000) {
        return JSON.stringify({
          results: enriched.slice(0, 10),
          count: 10,
          total_found: results.length,
          truncated: true,
          source: `${BASE}/find?layer=${DAMS_LAYER}`,
        }, null, 2);
      }
      return json;
    }

    case "get_dams_by_canton": {
      const canton = args.canton as string;
      if (!canton?.trim()) {
        throw new Error("canton is required (2-letter code, e.g. 'VS', 'GR', 'BE')");
      }

      const cantonCode = canton.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(cantonCode)) {
        throw new Error("canton must be a 2-letter Swiss canton code (e.g. 'VS', 'GR', 'BE', 'ZH')");
      }

      const limit = args.limit == null
        ? MAX_RESULTS
        : Math.min(Math.max(Math.trunc(Number(args.limit)) || MAX_RESULTS, 1), MAX_LIMIT);

      const bbox = await fetchCantonBbox(cantonCode);
      if (!bbox) {
        throw new Error(`Unknown canton code: "${cantonCode}". Use standard 2-letter Swiss canton abbreviations (VS, GR, BE, UR, TI, VD, etc.)`);
      }

      // The bbox only narrows the candidates; every one of them is then checked
      // against the canton polygon, because a box overlaps its neighbours.
      const [xmin, ymin, xmax, ymax] = bbox;
      const pad = BORDER_TOLERANCE_M;
      const allDams = await loadAllDams();
      const candidates = allDams.filter((dam) => {
        const x = dam.geometry?.x;
        const y = dam.geometry?.y;
        if (x == null || y == null) return false;
        return x >= xmin - pad && x <= xmax + pad && y >= ymin - pad && y <= ymax + pad;
      });

      const candidateCantons = await cantonsForDams(candidates);
      const cantonDams = candidates.filter((_, i) => candidateCantons[i]?.code === cantonCode);
      const cantonOf = new Map(candidates.map((dam, i) => [dam.featureId, candidateCantons[i]]));

      if (!cantonDams.length) {
        return JSON.stringify({
          canton: cantonCode,
          dams: [],
          count: 0,
          message: `No dams found in canton ${cantonCode}. This canton may not have any dams under federal supervision.`,
          source: `${BASE}/identify?layers=all:${DAMS_LAYER}`,
        }, null, 2);
      }

      const limited = cantonDams.slice(0, limit);
      const formatted = limited.map((dam) => formatDamSummary(dam, cantonOf.get(dam.featureId)));

      const response = {
        canton: cantonCode,
        dams: formatted,
        count: formatted.length,
        total_in_canton: cantonDams.length,
        note: cantonDams.length > limited.length
          ? `Showing first ${limited.length} of ${cantonDams.length} dams in canton ${cantonCode}. Raise limit (max ${MAX_LIMIT}) for more.`
          : undefined,
        source: `${BASE}/identify?layers=all:${DAMS_LAYER}`,
        canton_source: CANTON_LAYER,
      };

      const json = JSON.stringify(response, null, 2);
      if (json.length > 49000) {
        const slim = {
          canton: cantonCode,
          dams: formatted.slice(0, 10),
          count: 10,
          total_in_canton: cantonDams.length,
          truncated: true,
          source: `${BASE}/identify?layers=all:${DAMS_LAYER}`,
        };
        return JSON.stringify(slim, null, 2);
      }
      return json;
    }

    case "get_dam_details": {
      const damName = args.name as string;
      if (!damName?.trim()) {
        throw new Error("name is required");
      }

      // Search by damname first
      let results = await findDams(damName, "damname", true);

      // If multiple found, try to find exact match
      let dam: DamFindResult | undefined;
      if (results.length === 1) {
        dam = results[0];
      } else if (results.length > 1) {
        // Prefer exact case-insensitive match
        dam = results.find(
          (r) => r.attributes.damname.toLowerCase() === damName.toLowerCase()
        ) ?? results[0];
      } else {
        // Try facilityname as fallback
        results = await findDams(damName, "facilityname", true);
        if (results.length) {
          dam = results.find(
            (r) => r.attributes.damname.toLowerCase() === damName.toLowerCase()
          ) ?? results[0];
        }
      }

      if (!dam) {
        throw new Error(`No dam named "${damName}". Use search_dams to get the exact name.`);
      }

      const detail = formatDamDetail(dam, await cantonForDam(dam));
      const response = {
        found: true,
        ...detail,
        source: `${BASE}/${DAMS_LAYER}/${dam.featureId}`,
      };

      const json = JSON.stringify(response, null, 2);
      if (json.length > 49000) {
        // Shouldn't happen for a single dam, but safety net
        return json.slice(0, 49000) + "\n... [truncated]";
      }
      return json;
    }

    default:
      throw new Error(`Unknown dams tool: ${name}`);
  }
}
