import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch";
const PLZ_LAYER = "ch.swisstopo-vd.ortschaftenverzeichnis_plz";
const CANTON_LAYER = "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlzFindResult {
  featureId: string;
  id: string;
  layerBodId: string;
  layerName: string;
  bbox?: number[];
  attributes: {
    plz: number;
    zusziff: string;
    langtext: string;
    status: string;
    modified: string;
    label: number;
    bgdi_created?: string;
  };
}

interface PlzFindResponse {
  results: PlzFindResult[];
}

interface SearchResult {
  id: number;
  weight: number;
  attrs: {
    detail: string;
    featureId: string;
    label: string;
    lat: number;
    lon: number;
    origin: string;
    geom_st_box2d?: string;
    [key: string]: unknown;
  };
}

interface SearchResponse {
  results: SearchResult[];
}

interface CantonIdentifyResult {
  layerBodId: string;
  layerName: string;
  featureId: number;
  id: number;
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

interface CantonFindResult {
  featureId: string;
  id: string;
  bbox: number[];
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a canton abbreviation (e.g. "zh", "Zürich", "BE") to its
 * uppercase 2-letter code (e.g. "ZH", "BE").
 * Accepts full German/French/Italian names as well.
 */
function resolveCantonCode(input: string): string {
  const CANTON_NAMES: Record<string, string> = {
    // German names
    zürich: "ZH", zurich: "ZH", bern: "BE", luzern: "LU", uri: "UR",
    schwyz: "SZ", obwalden: "OW", nidwalden: "NW", glarus: "GL",
    zug: "ZG", freiburg: "FR", fribourg: "FR", solothurn: "SO",
    "basel-stadt": "BS", "basel-landschaft": "BL", schaffhausen: "SH",
    "appenzell ausserrhoden": "AR", "appenzell innerrhoden": "AI",
    "st. gallen": "SG", "st gallen": "SG", graubünden: "GR",
    graubuenden: "GR", grisons: "GR", aargau: "AG", thurgau: "TG",
    tessin: "TI", ticino: "TI", waadt: "VD", vaud: "VD", wallis: "VS",
    valais: "VS", neuenburg: "NE", neuchâtel: "NE", neuchatel: "NE",
    genf: "GE", genève: "GE", geneve: "GE", jura: "JU",
  };
  const lower = input.trim().toLowerCase();
  if (CANTON_NAMES[lower]) return CANTON_NAMES[lower];
  // Try as 2-letter abbreviation
  if (/^[a-z]{2}$/i.test(lower)) return lower.toUpperCase();
  throw new Error(
    `Unknown canton: "${input}". Use a 2-letter code (ZH, BE, …) or full name.`
  );
}

/**
 * Identify the canton for a given WGS84 point.
 * Returns { code, name } or null if outside Switzerland.
 */
async function identifyCanton(
  lat: number,
  lon: number
): Promise<{ code: string; name: string } | null> {
  const delta = 0.01;
  const url = buildUrl(`${BASE}/rest/services/all/MapServer/identify`, {
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    layers: `all:${CANTON_LAYER}`,
    mapExtent: `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`,
    imageDisplay: "100,100,96",
    tolerance: 0,
    sr: 4326,
    returnGeometry: false,
  });
  const data = await fetchJSON<CantonIdentifyResponse>(url);
  if (!data.results.length) return null;
  const a = data.results[0].attributes;
  return { code: a.ak, name: a.name };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const postTools = [
  {
    name: "lookup_postcode",
    description:
      "Look up a Swiss postcode (PLZ) to get locality name, canton, and coordinates. Source: Swiss federal geodata (swisstopo).",
    inputSchema: {
      type: "object",
      required: ["postcode"],
      properties: {
        postcode: {
          type: "string",
          description: "Swiss postal code (PLZ), e.g. \"8001\" or \"3000\"",
        },
      },
    },
  },
  {
    name: "search_postcode",
    description:
      "Search Swiss postcodes by city or locality name. Returns all PLZ entries matching the name. Source: Swiss federal geodata (swisstopo).",
    inputSchema: {
      type: "object",
      required: ["city_name"],
      properties: {
        city_name: {
          type: "string",
          description: "City or locality name, e.g. \"Zürich\", \"Bern\", \"Locarno\"",
        },
      },
    },
  },
  {
    name: "list_postcodes_in_canton",
    description:
      "List all Swiss postcodes (PLZ) in a given canton. Accepts 2-letter canton codes (ZH, BE, GR…) or full names. Source: Swiss federal geodata (swisstopo).",
    inputSchema: {
      type: "object",
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description:
            "Canton code (e.g. \"ZH\", \"BE\", \"GR\") or full name (e.g. \"Zürich\", \"Bern\", \"Graubünden\")",
        },
      },
    },
  },
  {
    name: "track_parcel",
    description:
      "Generate a Swiss Post parcel tracking URL for a given tracking number. Swiss Post does not provide a public tracking API, so this returns the official tracking page URL to open in a browser.",
    inputSchema: {
      type: "object",
      required: ["tracking_number"],
      properties: {
        tracking_number: {
          type: "string",
          description:
            "Swiss Post tracking number, e.g. \"99.00.123456.12345678\" for parcels or \"RI 123456789 CH\" for registered mail",
        },
      },
    },
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handlePost(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    // ── lookup_postcode ──────────────────────────────────────────────────────
    case "lookup_postcode": {
      const postcode = String(args.postcode ?? "").trim();
      if (!/^\d{4}$/.test(postcode)) {
        throw new Error(`Invalid Swiss postcode: "${postcode}". Must be a 4-digit number.`);
      }

      // 1. Fetch PLZ record from the official registry
      const findUrl = buildUrl(`${BASE}/rest/services/api/MapServer/find`, {
        layer: PLZ_LAYER,
        searchText: postcode,
        searchField: "plz",
        returnGeometry: false,
        sr: 4326,
      });
      const findData = await fetchJSON<PlzFindResponse>(findUrl);

      if (!findData.results.length) {
        return JSON.stringify({ found: false, postcode, message: "Postcode not found." });
      }

      const record = findData.results[0];
      const attr = record.attributes;

      // 2. Get coordinates + confirm locality from SearchServer (zipcode origin)
      const searchUrl = buildUrl(`${BASE}/rest/services/api/SearchServer`, {
        searchText: postcode,
        type: "locations",
        origins: "zipcode",
        sr: 4326,
        limit: 1,
      });
      const searchData = await fetchJSON<SearchResponse>(searchUrl);
      const searchEntry =
        searchData.results.find((r) => r.attrs.origin === "zipcode") ?? null;

      const lat = searchEntry?.attrs.lat ?? null;
      const lon = searchEntry?.attrs.lon ?? null;

      // 3. Identify canton
      const canton =
        lat !== null && lon !== null ? await identifyCanton(lat, lon) : null;

      return JSON.stringify({
        found: true,
        postcode: attr.plz,
        locality: attr.langtext,
        canton: canton
          ? { code: canton.code, name: canton.name }
          : null,
        coordinates: lat !== null ? { lat, lon } : null,
        source: "swisstopo — Amtliches Ortschaftenverzeichnis",
      });
    }

    // ── search_postcode ──────────────────────────────────────────────────────
    case "search_postcode": {
      const cityName = String(args.city_name ?? "").trim();
      if (!cityName) {
        throw new Error("city_name must not be empty.");
      }

      const findUrl = buildUrl(`${BASE}/rest/services/api/MapServer/find`, {
        layer: PLZ_LAYER,
        searchText: cityName,
        searchField: "langtext",
        returnGeometry: false,
        sr: 4326,
      });
      const findData = await fetchJSON<PlzFindResponse>(findUrl);

      const entries = findData.results.map((r) => ({
        postcode: r.attributes.plz,
        locality: r.attributes.langtext,
        additionalNumber: r.attributes.zusziff !== "00" ? r.attributes.zusziff : undefined,
      }));

      // Deduplicate by PLZ (multiple records can share same PLZ with different suffixes)
      const seen = new Set<number>();
      const unique = entries.filter((e) => {
        if (seen.has(e.postcode)) return false;
        seen.add(e.postcode);
        return true;
      });

      return JSON.stringify({
        query: cityName,
        count: unique.length,
        results: unique,
        source: "swisstopo — Amtliches Ortschaftenverzeichnis",
      });
    }

    // ── list_postcodes_in_canton ─────────────────────────────────────────────
    case "list_postcodes_in_canton": {
      const cantonInput = String(args.canton ?? "").trim();
      if (!cantonInput) {
        throw new Error("canton must not be empty.");
      }

      const cantonCode = resolveCantonCode(cantonInput);

      // 1. Get canton bounding box
      const cantonUrl = buildUrl(`${BASE}/rest/services/api/MapServer/find`, {
        layer: CANTON_LAYER,
        searchText: cantonCode,
        searchField: "ak",
        returnGeometry: true,
        sr: 4326,
      });
      const cantonData = await fetchJSON<CantonFindResponse>(cantonUrl);

      if (!cantonData.results.length) {
        throw new Error(`Canton not found: "${cantonInput}"`);
      }

      const cantonResult = cantonData.results[0];
      const [minX, minY, maxX, maxY] = cantonResult.bbox;
      const cantonAttr = cantonResult.attributes;
      const mapExtent = `${minX},${minY},${maxX},${maxY}`;

      // 2. Identify PLZ features within the canton bbox
      const identifyUrl = buildUrl(`${BASE}/rest/services/api/MapServer/identify`, {
        geometry: mapExtent,
        geometryType: "esriGeometryEnvelope",
        layers: `all:${PLZ_LAYER}`,
        mapExtent,
        imageDisplay: "1000,1000,96",
        tolerance: 0,
        sr: 4326,
        returnGeometry: false,
      });
      const plzData = await fetchJSON<{ results: PlzFindResult[] }>(identifyUrl);

      const postcodes = plzData.results
        .map((r) => ({
          postcode: r.attributes.plz,
          locality: r.attributes.langtext,
        }))
        .sort((a, b) => a.postcode - b.postcode);

      // Deduplicate by PLZ
      const seen = new Set<number>();
      const unique = postcodes.filter((e) => {
        if (seen.has(e.postcode)) return false;
        seen.add(e.postcode);
        return true;
      });

      return JSON.stringify({
        canton: { code: cantonAttr.ak, name: cantonAttr.name },
        count: unique.length,
        postcodes: unique,
        note:
          unique.length >= 200
            ? "Results may be capped at 200 by the API. Cross-border PLZ entries near canton boundaries may be included."
            : undefined,
        source: "swisstopo — Amtliches Ortschaftenverzeichnis",
      });
    }

    // ── track_parcel ─────────────────────────────────────────────────────────
    case "track_parcel": {
      const trackingNumber = String(args.tracking_number ?? "").trim();
      if (!trackingNumber) {
        throw new Error("tracking_number must not be empty.");
      }

      const trackingUrl = `https://service.post.ch/ekp-web/ui/entry/shipping/1/parcel/detail?parcelId=${encodeURIComponent(trackingNumber)}`;

      return JSON.stringify({
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        note: "Swiss Post does not provide a public tracking API. This URL opens the official Swiss Post tracking page for your parcel. No authentication required to view tracking status in browser.",
        formats: "Swiss Post tracking number formats: \"99.xx.xxxxxx.xxxxxxxx\" for standard parcels (e.g. 99.00.123456.12345678), \"RI xxxxxxxxx CH\" for registered mail, \"RR xxxxxxxxx CH\" for registered parcels.",
      });
    }

    default:
      throw new Error(`Unknown post tool: ${name}`);
  }
}
