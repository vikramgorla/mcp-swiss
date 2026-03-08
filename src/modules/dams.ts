// Swiss Dams & Reservoirs module — powered by Federal Office of Energy (SFOE) via swisstopo BGDI
// Data source: https://api3.geo.admin.ch — layer ch.bfe.stauanlagen-bundesaufsicht
// All dams under federal supervision in Switzerland. No auth required.

import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch/rest/services/api/MapServer";
const DAMS_LAYER = "ch.bfe.stauanlagen-bundesaufsicht";
const CANTON_LAYER = "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill";
const MAX_RESULTS = 20;

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract year from ISO date string like "1961-01-01" */
function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/** Format a dam result for search/list output (compact) */
function formatDamSummary(dam: DamFindResult, canton?: string | null): Record<string, unknown> {
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
    canton: canton ?? null,
    year_built: a.baujahr ?? extractYear(a.beginningofoperation),
  };
}

/** Format a dam result for full detail output */
function formatDamDetail(dam: DamFindResult, canton?: string | null): Record<string, unknown> {
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
    canton: canton ?? null,
    feature_id: dam.featureId,
  };
}

/** Fetch canton code (e.g. "VS") for a dam via coordinate identify */
async function fetchCantonForCoords(x: number, y: number): Promise<string | null> {
  const url = buildUrl(`${BASE}/identify`, {
    geometry: `${x},${y}`,
    geometryType: "esriGeometryPoint",
    layers: `all:${CANTON_LAYER}`,
    mapExtent: "480000,70000,840000,300000",
    imageDisplay: "1000,800,96",
    tolerance: "0",
    sr: "21781",
    returnGeometry: "false",
  });
  const data = await fetchJSON<CantonIdentifyResponse>(url);
  return data.results?.[0]?.attributes?.ak ?? null;
}

/** Fetch canton bbox by 2-letter canton code */
async function fetchCantonBbox(cantonCode: string): Promise<[number, number, number, number] | null> {
  const url = buildUrl(`${BASE}/find`, {
    layer: CANTON_LAYER,
    searchText: cantonCode.toUpperCase(),
    searchField: "ak",
    returnGeometry: "false",
  });
  const data = await fetchJSON<CantonFindResponse>(url);
  if (!data.results?.length) return null;
  // Re-fetch with geometry=true to get bbox
  const urlWithGeom = buildUrl(`${BASE}/find`, {
    layer: CANTON_LAYER,
    searchText: cantonCode.toUpperCase(),
    searchField: "ak",
  });
  const dataWithGeom = await fetchJSON<CantonFindResponse>(urlWithGeom);
  const canton = dataWithGeom.results?.[0];
  return canton?.bbox ?? null;
}

/** Fetch all dams matching searchText in a given field */
async function findDams(searchText: string, searchField: string, withGeometry = false): Promise<DamFindResult[]> {
  const url = buildUrl(`${BASE}/find`, {
    layer: DAMS_LAYER,
    searchText,
    searchField,
    returnGeometry: withGeometry ? "true" : "false",
  });
  const data = await fetchJSON<DamFindResponse>(url);
  return data.results ?? [];
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const damsTools = [
  {
    name: "search_dams",
    description:
      "Search Swiss dams and reservoirs under federal supervision by name. Searches both dam names and reservoir names. Returns dam type, height, crest length, reservoir volume, purpose, canton, and year built. Data source: Swiss Federal Office of Energy (SFOE) via swisstopo BGDI.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "Dam or reservoir name to search (e.g. 'Grimsel', 'Grande Dixence', 'Mattmark', 'Lac des Dix'). Partial names are supported.",
        },
      },
    },
  },
  {
    name: "get_dams_by_canton",
    description:
      "List all Swiss dams under federal supervision in a given canton. Returns up to 20 dams with basic details. Data source: Swiss Federal Office of Energy (SFOE) via swisstopo BGDI.",
    inputSchema: {
      type: "object",
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description:
            "Swiss canton 2-letter abbreviation code (e.g. 'VS' for Valais, 'GR' for Graubünden, 'BE' for Bern, 'UR' for Uri, 'TI' for Ticino, 'VD' for Vaud).",
        },
      },
    },
  },
  {
    name: "get_dam_details",
    description:
      "Get full technical details of a specific Swiss dam by name. Returns all available fields: dam type, height, crest length, crest level, reservoir name, impoundment volume, storage level, purpose, operation dates, federal supervision start, and canton. Data source: Swiss Federal Office of Energy (SFOE) via swisstopo BGDI.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "Dam name (e.g. 'Grande Dixence', 'Spitallamm', 'Mattmark', 'Verzasca'). Use search_dams first if you are unsure of the exact name.",
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

      // Try damname first, fall back to reservoirname if no results
      let results = await findDams(query, "damname");
      if (!results.length) {
        results = await findDams(query, "reservoirname");
      }

      if (!results.length) {
        return JSON.stringify({
          results: [],
          count: 0,
          message: `No dams found matching "${query}". Try a shorter search term or reservoir name.`,
          source: `${BASE}/find?layer=${DAMS_LAYER}`,
        }, null, 2);
      }

      // For up to 5 results, resolve canton via coordinate identify
      const enriched = await Promise.all(
        results.slice(0, MAX_RESULTS).map(async (dam) => {
          let canton: string | null = null;
          if (dam.geometry?.x != null && dam.geometry?.y != null) {
            canton = await fetchCantonForCoords(dam.geometry.x, dam.geometry.y).catch(() => null);
          }
          return formatDamSummary(dam, canton);
        })
      );

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

      // Get canton bounding box
      const bbox = await fetchCantonBbox(cantonCode);
      if (!bbox) {
        throw new Error(`Unknown canton code: "${cantonCode}". Use standard 2-letter Swiss canton abbreviations (VS, GR, BE, UR, TI, VD, etc.)`);
      }

      const [xmin, ymin, xmax, ymax] = bbox;

      // Fetch all dams with geometry to filter by canton bbox
      const allDams = await findDams("%", "damname", true);

      // Filter dams whose coordinates fall within the canton bbox
      const cantonDams = allDams.filter((dam) => {
        const x = dam.geometry?.x;
        const y = dam.geometry?.y;
        if (x == null || y == null) return false;
        return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
      });

      if (!cantonDams.length) {
        return JSON.stringify({
          canton: cantonCode,
          dams: [],
          count: 0,
          message: `No dams found in canton ${cantonCode}. This canton may not have any dams under federal supervision.`,
          source: `${BASE}/find?layer=${DAMS_LAYER}`,
        }, null, 2);
      }

      const limited = cantonDams.slice(0, MAX_RESULTS);
      const formatted = limited.map((dam) => formatDamSummary(dam, cantonCode));

      const response = {
        canton: cantonCode,
        dams: formatted,
        count: formatted.length,
        total_in_canton: cantonDams.length,
        note: cantonDams.length > MAX_RESULTS
          ? `Showing first ${MAX_RESULTS} of ${cantonDams.length} dams in canton ${cantonCode}.`
          : undefined,
        source: `${BASE}/find?layer=${DAMS_LAYER}`,
      };

      const json = JSON.stringify(response, null, 2);
      if (json.length > 49000) {
        const slim = {
          canton: cantonCode,
          dams: formatted.slice(0, 10),
          count: 10,
          total_in_canton: cantonDams.length,
          truncated: true,
          source: `${BASE}/find?layer=${DAMS_LAYER}`,
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
        return JSON.stringify({
          found: false,
          name: damName,
          message: `No dam found with name "${damName}". Use search_dams to find the exact name.`,
          source: `${BASE}/find?layer=${DAMS_LAYER}`,
        }, null, 2);
      }

      // Resolve canton from coordinates
      let canton: string | null = null;
      if (dam.geometry?.x != null && dam.geometry?.y != null) {
        canton = await fetchCantonForCoords(dam.geometry.x, dam.geometry.y).catch(() => null);
      }

      const detail = formatDamDetail(dam, canton);
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
