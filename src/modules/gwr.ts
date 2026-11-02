/**
 * GWR — Federal Register of Buildings and Dwellings (GWR / RegBL)
 *
 * Data source: Swiss Federal Statistical Office (BFS/OFS), published through
 * the swisstopo geo.admin.ch REST API, layer `ch.bfs.gebaeude_wohnungs_register`.
 * Free, no authentication. Updated weekly by the BFS.
 *
 * Provides:
 *   - search_buildings: find buildings by address text → EGID, address, category, year
 *   - get_building: full decoded building record by EGID, incl. dwellings
 *   - buildings_near: buildings around a WGS84 point within a small radius
 */

import { fetchJSON, buildUrl } from "../utils/http.js";

const MAPSERVER = "https://api3.geo.admin.ch/rest/services/ech/MapServer";
const SEARCH = "https://api3.geo.admin.ch/rest/services/ech/SearchServer";
const LAYER = "ch.bfs.gebaeude_wohnungs_register";
const SOURCE = "Federal Register of Buildings and Dwellings (GWR), BFS — via api3.geo.admin.ch";

// ── API response types ─────────────────────────────────────────────────────

/** Raw GWR attributes as served by geo.admin.ch (one feature per building entrance). */
export interface GwrAttributes {
  egid: string;
  edid?: string;
  label?: string;
  strname_deinr?: string;
  deinr?: string | null;
  strname?: string[] | null;
  dplz4?: number | null;
  dplzname?: string | null;
  ggdename?: string | null;
  ggdenr?: number | null;
  gdekt?: string | null;
  egrid?: string | null;
  lparz?: string | null;
  gebnr?: string | null;
  gbez?: string | null;
  gkode?: number | null;
  gkodn?: number | null;
  gstat?: number | null;
  gkat?: number | null;
  gklas?: number | null;
  gbauj?: number | null;
  gbaum?: number | null;
  gbaup?: number | null;
  gabbj?: number | null;
  garea?: number | null;
  gvol?: number | null;
  gastw?: number | null;
  ganzwhg?: number | null;
  gazzi?: number | null;
  gebf?: number | null;
  gwaerzh1?: number | null;
  genh1?: number | null;
  gwaerdath1?: string | null;
  gwaerzh2?: number | null;
  genh2?: number | null;
  gwaerdath2?: string | null;
  gwaerzw1?: number | null;
  genw1?: number | null;
  gwaerdatw1?: string | null;
  gwaerzw2?: number | null;
  genw2?: number | null;
  gwaerdatw2?: string | null;
  gexpdat?: string | null;
  ewid?: string[] | null;
  whgnr?: string[] | null;
  wstwk?: (number | null)[] | null;
  wmehrg?: (number | null)[] | null;
  wbez?: (string | null)[] | null;
  wstat?: (number | null)[] | null;
  wbauj?: (number | null)[] | null;
  warea?: (number | null)[] | null;
  wazim?: (number | null)[] | null;
  wkche?: (number | null)[] | null;
}

interface GwrFeature {
  featureId: string;
  geometry?: { x: number; y: number } | null;
  attributes: GwrAttributes;
}

interface FindResponse {
  results: GwrFeature[];
}

interface FeaturesResponse {
  features: GwrFeature[];
}

interface FeatureSearchResponse {
  results: Array<{
    attrs: {
      featureId?: string;
      label?: string;
      lat?: number;
      lon?: number;
      layer?: string;
    };
  }>;
}

// ── GWR code lists (official feature catalogue, EN) ────────────────────────

/** GKAT — building category */
export const BUILDING_CATEGORY: Record<number, string> = {
  1010: "Provisional shelter",
  1020: "Residential only",
  1030: "Residential with secondary use",
  1040: "Partly residential",
  1060: "Non-residential",
  1080: "Special structure",
};

/** GKLAS — building class (Eurostat CC-based) */
export const BUILDING_CLASS: Record<number, string> = {
  1110: "Single-dwelling building",
  1121: "Two-dwelling building",
  1122: "Building with three or more dwellings",
  1130: "Residential building for communities",
  1211: "Hotel",
  1212: "Other short-stay accommodation",
  1220: "Office building",
  1230: "Wholesale and retail trade building",
  1231: "Restaurant or bar",
  1241: "Transport and communication building",
  1242: "Garage building",
  1251: "Industrial building",
  1252: "Tank, silo or warehouse",
  1261: "Culture and leisure building",
  1262: "Museum or library",
  1263: "School or university building",
  1264: "Hospital or care institution",
  1265: "Sports hall",
  1271: "Agricultural operations building",
  1272: "Church or religious building",
  1273: "Historic or protected monument",
  1274: "Other structure",
  1275: "Other collective accommodation",
  1276: "Livestock building",
  1277: "Crop production building",
  1278: "Other agricultural building",
};

/** GSTAT — building status */
export const BUILDING_STATUS: Record<number, string> = {
  1001: "Planned",
  1002: "Approved",
  1003: "Under construction",
  1004: "Existing",
  1005: "Unusable",
  1007: "Demolished",
  1008: "Not built",
};

/** WSTAT — dwelling status */
export const DWELLING_STATUS: Record<number, string> = {
  3001: "Planned",
  3002: "Approved",
  3003: "Under construction",
  3004: "Existing",
  3005: "Unusable",
  3007: "Removed",
  3008: "Not built",
};

/** GBAUP — construction period */
export const CONSTRUCTION_PERIOD: Record<number, string> = {
  8011: "Before 1919",
  8012: "1919–1945",
  8013: "1946–1960",
  8014: "1961–1970",
  8015: "1971–1980",
  8016: "1981–1985",
  8017: "1986–1990",
  8018: "1991–1995",
  8019: "1996–2000",
  8020: "2001–2005",
  8021: "2006–2010",
  8022: "2011–2015",
  8023: "After 2015",
};

/** GENH / GENW — energy / heat source (heating and hot water) */
export const ENERGY_SOURCE: Record<number, string> = {
  7500: "None",
  7501: "Air",
  7510: "Geothermal (generic)",
  7511: "Geothermal probe",
  7512: "Geothermal collector",
  7513: "Water (groundwater, surface water)",
  7520: "Gas",
  7530: "Heating oil",
  7540: "Wood (generic)",
  7541: "Wood (logs)",
  7542: "Wood (pellets)",
  7543: "Wood (chips)",
  7550: "Waste heat",
  7560: "Electricity",
  7570: "Solar (thermal)",
  7580: "District heating (generic)",
  7581: "District heating (high temperature)",
  7582: "District heating (low temperature)",
  7598: "Undetermined",
  7599: "Other",
};

/** GWAERZH — heat generator for heating */
export const HEATING_GENERATOR: Record<number, string> = {
  7400: "No heat generator",
  7410: "Heat pump (single building)",
  7411: "Heat pump (several buildings)",
  7420: "Solar thermal system (single building)",
  7421: "Solar thermal system (several buildings)",
  7430: "Boiler (single building)",
  7431: "Boiler (several buildings)",
  7432: "Non-condensing boiler (single building)",
  7433: "Non-condensing boiler (several buildings)",
  7434: "Condensing boiler (single building)",
  7435: "Condensing boiler (several buildings)",
  7436: "Stove",
  7440: "Combined heat and power (single building)",
  7441: "Combined heat and power (several buildings)",
  7450: "Electric central heating (single building)",
  7451: "Electric central heating (several buildings)",
  7452: "Direct electric heating",
  7460: "Heat exchanger incl. district heating (single building)",
  7461: "Heat exchanger incl. district heating (several buildings)",
  7499: "Other",
};

/** GWAERZW — heat generator for hot water */
export const HOT_WATER_GENERATOR: Record<number, string> = {
  7600: "No heat generator",
  7610: "Heat pump",
  7620: "Solar thermal system",
  7630: "Boiler",
  7632: "Non-condensing boiler",
  7634: "Condensing boiler",
  7640: "Combined heat and power",
  7650: "Central electric water heater",
  7651: "Small electric water heater",
  7660: "Heat exchanger incl. district heating",
  7699: "Other",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function decode(table: Record<number, string>, code: number | null | undefined): string | null {
  if (code === null || code === undefined) return null;
  return table[code] ?? `Unknown code ${code}`;
}

/** WSTWK floor code → human label (3100 = ground floor, 31xx = xx-th floor, 34xx = xx-th basement). */
export function decodeFloor(code: number | null | undefined): string | null {
  if (code === null || code === undefined) return null;
  if (code === 3100) return "Ground floor";
  if (code > 3100 && code <= 3199) return `Floor ${code - 3100}`;
  if (code >= 3401 && code <= 3419) return `Basement ${code - 3400}`;
  return `Unknown code ${code}`;
}

/** "29.11.2001" → "2001-11-29"; "-" / empty → null. */
export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** Great-circle distance in metres. */
export function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function clamp(value: unknown, def: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || value === undefined || value === null || value === "") return def;
  return Math.min(Math.max(Math.round(n), min), max);
}

function entranceAddress(a: GwrAttributes): string {
  const street = nonEmpty(a.strname_deinr) ?? nonEmpty(a.label) ?? "";
  const locality = [a.dplz4, a.dplzname].filter((v) => v !== null && v !== undefined && v !== "").join(" ");
  return [street, locality].filter(Boolean).join(", ");
}

function heatingSystem(
  generator: number | null | undefined,
  source: number | null | undefined,
  updated: string | null | undefined,
  generatorTable: Record<number, string>
) {
  const noGenerator = generator === null || generator === undefined || generator === 7400 || generator === 7600;
  const noSource = source === null || source === undefined || source === 7500;
  if (noGenerator && noSource) return null;
  return {
    generator: decode(generatorTable, generator),
    energy_source: decode(ENERGY_SOURCE, source),
    updated: toIsoDate(updated),
  };
}

/** Compact summary shared by search_buildings and buildings_near. */
function summarize(a: GwrAttributes) {
  return {
    egid: Number(a.egid),
    address: entranceAddress(a),
    ...(nonEmpty(a.gbez) ? { name: nonEmpty(a.gbez) } : {}),
    municipality: a.ggdename ?? null,
    canton: a.gdekt ?? null,
    category: decode(BUILDING_CATEGORY, a.gkat),
    class: decode(BUILDING_CLASS, a.gklas),
    status: decode(BUILDING_STATUS, a.gstat),
    construction_year: a.gbauj ?? null,
    construction_period: decode(CONSTRUCTION_PERIOD, a.gbaup),
    floors: a.gastw ?? null,
    dwellings: a.ganzwhg ?? null,
  };
}

function parseEgid(value: unknown): string {
  const s = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,9}$/.test(s) || Number(s) === 0) {
    throw new Error("egid must be a positive integer (Swiss federal building identifier, up to 9 digits)");
  }
  return String(Number(s));
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const gwrTools = [
  {
    name: "search_buildings",
    description:
      "Find buildings in the federal buildings register (GWR/RegBL) by address; gives EGIDs for get_building",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: {
          type: "string",
          description: "Street, number, locality, e.g. Bundesplatz 3 3011 Bern",
        },
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
  {
    name: "get_building",
    description:
      "Full GWR record of one building by EGID: construction, floors, areas, heating/hot-water system and energy source, parcel (EGRID), entrances, dwellings",
    inputSchema: {
      type: "object",
      required: ["egid"],
      properties: {
        egid: {
          type: "number",
          description: "EGID, e.g. 2119257",
        },
        max_dwellings: {
          type: "number",
          description: "max 500; 0 = summary only",
          default: 50,
        },
      },
    },
  },
  {
    name: "buildings_near",
    description:
      "GWR buildings nearest a WGS84 point (small radius), with EGIDs",
    inputSchema: {
      type: "object",
      required: ["lat", "lon"],
      properties: {
        lat: { type: "number", description: "Latitude (WGS84)" },
        lon: { type: "number", description: "Longitude (WGS84)" },
        radius: {
          type: "number",
          description: "Metres, max 250",
          default: 50,
        },
        limit: {
          type: "number",
          description: "max 50",
          default: 10,
        },
      },
    },
  },
];

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleSearchBuildings(args: Record<string, unknown>): Promise<string> {
  const address = typeof args.address === "string" ? args.address.trim() : "";
  if (!address) throw new Error("address is required");
  const limit = clamp(args.limit, 5, 1, 20);

  const search = await fetchJSON<FeatureSearchResponse>(
    buildUrl(SEARCH, {
      type: "featuresearch",
      features: LAYER,
      searchText: address,
      limit,
    })
  );

  const hits = (search.results ?? [])
    .map((r) => r.attrs)
    .filter((a) => a.featureId && (!a.layer || a.layer === LAYER))
    .slice(0, limit);

  if (hits.length === 0) {
    return JSON.stringify({ query: address, count: 0, buildings: [], source: SOURCE });
  }

  // One batched request for all matched entrances (comma-separated feature ids).
  const ids = hits.map((h) => encodeURIComponent(h.featureId as string)).join(",");
  const details = await fetchJSON<FeaturesResponse>(
    buildUrl(`${MAPSERVER}/${LAYER}/${ids}`, { returnGeometry: false })
  );
  const byId = new Map<string, GwrAttributes>();
  for (const f of details.features ?? []) byId.set(String(f.featureId), f.attributes);

  const buildings = hits.map((h) => {
    const attrs = byId.get(h.featureId as string);
    const coords = {
      lat: typeof h.lat === "number" ? round6(h.lat) : null,
      lon: typeof h.lon === "number" ? round6(h.lon) : null,
    };
    if (!attrs) {
      return {
        egid: Number(String(h.featureId).split("_")[0]),
        address: (h.label ?? "").replace(/<[^>]+>/g, ""),
        ...coords,
      };
    }
    return { ...summarize(attrs), ...coords };
  });

  return JSON.stringify({ query: address, count: buildings.length, buildings, source: SOURCE });
}

async function handleGetBuilding(args: Record<string, unknown>): Promise<string> {
  const egid = parseEgid(args.egid);
  const maxDwellings = clamp(args.max_dwellings, 50, 0, 500);

  // `find` returns one feature per building entrance (featureId = <egid>_<edid>).
  const res = await fetchJSON<FindResponse>(
    buildUrl(`${MAPSERVER}/find`, {
      layer: LAYER,
      searchField: "egid",
      searchText: egid,
      contains: false,
      returnGeometry: true,
      sr: 4326,
    })
  );

  const features = (res.results ?? [])
    .filter((f) => String(f.attributes?.egid) === egid)
    .sort((x, y) => Number(x.attributes.edid ?? 0) - Number(y.attributes.edid ?? 0));

  if (features.length === 0) {
    throw new Error(`No building found in the GWR with EGID ${egid}`);
  }

  const a = features[0].attributes;
  const firstGeom = features.find((f) => f.geometry)?.geometry;

  const entrances = features.map((f) => ({
    edid: Number(f.attributes.edid ?? 0),
    address: entranceAddress(f.attributes),
    ...(f.geometry ? { lat: round6(f.geometry.y), lon: round6(f.geometry.x) } : {}),
  }));

  // Dwellings are attached to the entrance they belong to — merge all entrances.
  type Dwelling = {
    ewid: number;
    admin_number: string | null;
    floor: string | null;
    location: string | null;
    rooms: number | null;
    area_m2: number | null;
    kitchen: boolean | null;
    multi_floor: boolean | null;
    construction_year: number | null;
    status: string | null;
  };
  const dwellings: Dwelling[] = [];
  for (const f of features) {
    const d = f.attributes;
    const ewids = d.ewid ?? [];
    for (let i = 0; i < ewids.length; i++) {
      const kitchen = d.wkche?.[i];
      const multi = d.wmehrg?.[i];
      dwellings.push({
        ewid: Number(ewids[i]),
        admin_number: nonEmpty(d.whgnr?.[i]),
        floor: decodeFloor(d.wstwk?.[i]),
        location: nonEmpty(d.wbez?.[i]),
        rooms: d.wazim?.[i] ?? null,
        area_m2: d.warea?.[i] ?? null,
        kitchen: kitchen === null || kitchen === undefined ? null : kitchen === 1,
        multi_floor: multi === null || multi === undefined ? null : multi === 1,
        construction_year: d.wbauj?.[i] ?? null,
        status: decode(DWELLING_STATUS, d.wstat?.[i]),
      });
    }
  }
  dwellings.sort((x, y) => x.ewid - y.ewid);

  const roomsTotal = dwellings.reduce((s, d) => s + (d.rooms ?? 0), 0);
  const areaTotal = dwellings.reduce((s, d) => s + (d.area_m2 ?? 0), 0);

  const heating = [
    heatingSystem(a.gwaerzh1, a.genh1, a.gwaerdath1, HEATING_GENERATOR),
    heatingSystem(a.gwaerzh2, a.genh2, a.gwaerdath2, HEATING_GENERATOR),
  ].filter(Boolean);
  const hotWater = [
    heatingSystem(a.gwaerzw1, a.genw1, a.gwaerdatw1, HOT_WATER_GENERATOR),
    heatingSystem(a.gwaerzw2, a.genw2, a.gwaerdatw2, HOT_WATER_GENERATOR),
  ].filter(Boolean);

  return JSON.stringify({
    egid: Number(egid),
    name: nonEmpty(a.gbez),
    address: entrances[0].address,
    municipality: a.ggdename ?? null,
    bfs_municipality_number: a.ggdenr ?? null,
    canton: a.gdekt ?? null,
    coordinates: {
      lat: firstGeom ? round6(firstGeom.y) : null,
      lon: firstGeom ? round6(firstGeom.x) : null,
      lv95_e: a.gkode ?? null,
      lv95_n: a.gkodn ?? null,
    },
    category: decode(BUILDING_CATEGORY, a.gkat),
    class: decode(BUILDING_CLASS, a.gklas),
    status: decode(BUILDING_STATUS, a.gstat),
    construction_year: a.gbauj ?? null,
    construction_month: a.gbaum ?? null,
    construction_period: decode(CONSTRUCTION_PERIOD, a.gbaup),
    demolition_year: a.gabbj ?? null,
    floors: a.gastw ?? null,
    footprint_area_m2: a.garea ?? null,
    volume_m3: a.gvol ?? null,
    energy_reference_area_m2: a.gebf ?? null,
    separate_rooms: a.gazzi ?? null,
    heating,
    hot_water: hotWater,
    parcel: {
      number: nonEmpty(a.lparz),
      egrid: nonEmpty(a.egrid),
      official_building_number: nonEmpty(a.gebnr),
    },
    entrances,
    dwellings_summary: {
      count: a.ganzwhg ?? dwellings.length,
      listed: dwellings.length,
      total_rooms: dwellings.length ? roomsTotal : null,
      total_area_m2: dwellings.length ? areaTotal : null,
    },
    dwellings: dwellings.slice(0, maxDwellings),
    ...(dwellings.length > maxDwellings ? { dwellings_truncated: true } : {}),
    data_as_of: toIsoDate(a.gexpdat),
    source: SOURCE,
  });
}

async function handleBuildingsNear(args: Record<string, unknown>): Promise<string> {
  const lat = Number(args.lat);
  const lon = Number(args.lon);
  if (
    args.lat === undefined || args.lon === undefined ||
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    lat < 45.7 || lat > 47.9 || lon < 5.8 || lon > 10.6
  ) {
    throw new Error("lat and lon are required and must be WGS84 coordinates inside Switzerland");
  }
  const radius = clamp(args.radius, 50, 1, 250);
  const limit = clamp(args.limit, 10, 1, 50);

  const dLat = radius / 111320;
  const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const envelope = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map(round6).join(",");

  const res = await fetchJSON<{ results: GwrFeature[] }>(
    buildUrl(`${MAPSERVER}/identify`, {
      layers: `all:${LAYER}`,
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
      sr: 4326,
      tolerance: 0,
      returnGeometry: true,
    })
  );
  const raw = res.results ?? [];

  // Keep the closest entrance per building, within the circular radius.
  const best = new Map<string, { f: GwrFeature; dist: number }>();
  for (const f of raw) {
    if (!f.geometry) continue;
    const dist = haversineMetres(lat, lon, f.geometry.y, f.geometry.x);
    if (dist > radius) continue;
    const key = String(f.attributes.egid);
    const prev = best.get(key);
    if (!prev || dist < prev.dist) best.set(key, { f, dist });
  }

  const sorted = [...best.values()].sort((x, y) => x.dist - y.dist);
  const buildings = sorted.slice(0, limit).map(({ f, dist }) => ({
    ...summarize(f.attributes),
    distance_m: Math.round(dist),
    lat: round6(f.geometry!.y),
    lon: round6(f.geometry!.x),
  }));

  return JSON.stringify({
    center: { lat, lon },
    radius_m: radius,
    count: buildings.length,
    total_in_radius: sorted.length,
    // geo.admin.ch identify caps results (~200 features); dense areas may be incomplete.
    ...(raw.length >= 200 ? { note: "Upstream result cap reached — reduce the radius for a complete list." } : {}),
    buildings,
    source: SOURCE,
  });
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

export async function handleGwr(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_buildings":
      return handleSearchBuildings(args);
    case "get_building":
      return handleGetBuilding(args);
    case "buildings_near":
      return handleBuildingsNear(args);
    default:
      throw new Error(`Unknown GWR tool: ${name}`);
  }
}
