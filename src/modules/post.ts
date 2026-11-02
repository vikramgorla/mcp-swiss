import { inflateRawSync } from "node:zlib";

import { cached } from "../utils/cache.js";
import { fetchBody, fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api3.geo.admin.ch";
const PLZ_LAYER = "ch.swisstopo-vd.ortschaftenverzeichnis_plz";
const CANTON_LAYER = "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill";

// The MapServer layer exposes only plz/locality, so it cannot answer "which canton".
// The published register behind the same layer does: one row per locality/municipality
// with the canton, the BFS number and the share of the locality's addresses.
const PLZ_REGISTER_URL =
  "https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz_2056.csv.zip";
const REGISTER_SOURCE = "swisstopo — Amtliches Ortschaftenverzeichnis (AMTOVZ)";

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

/** One row of the official locality register. */
interface RegisterRow {
  postcode: number;
  /** Additional digit ("00" for the main locality). */
  suffix: string;
  locality: string;
  municipality: string;
  bfsNumber: number;
  /** 2-letter canton code; empty for the Liechtenstein localities the register carries. */
  canton: string;
  /** Share of the locality's addresses that lie in this municipality, in percent. */
  addressShare: number;
}

// ── Register (cached per process) ────────────────────────────────────────────

// The register is republished monthly and the download is ~130 KB, so a day is
// long enough to keep it out of the hot path and short enough that a server
// left running for weeks picks up new postcodes.
const REGISTER_TTL_MS = 24 * 60 * 60 * 1000;

// The CSV is ~500 KB. 32 MB leaves room for the register to grow while keeping
// a hostile or corrupt archive from inflating into the heap unbounded.
const MAX_CSV_BYTES = 32 * 1024 * 1024;

function tooLarge(limit: number): Error {
  return new Error(
    `PLZ register CSV exceeds the ${limit / (1024 * 1024)} MB decompression limit — refusing to load it`
  );
}

/** zlib reports the cap as ERR_BUFFER_TOO_LARGE; say what actually happened. */
function inflate(data: Buffer, limit: number): Buffer {
  try {
    return inflateRawSync(data, { maxOutputLength: limit });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ERR_BUFFER_TOO_LARGE") throw tooLarge(limit);
    throw err;
  }
}

/** Read the first .csv entry out of a ZIP archive (stored or deflated). */
export function readCsvFromZip(zip: Buffer, limit: number = MAX_CSV_BYTES): string {
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0 && i > zip.length - 22 - 65536; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("PLZ register download is not a ZIP archive");

  const entries = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < entries; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) break;
    const method = zip.readUInt16LE(p + 10);
    const compressedSize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nameLen);

    if (name.toLowerCase().endsWith(".csv")) {
      const start =
        localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
      const data = zip.subarray(start, start + compressedSize);
      const raw = method === 0 ? data : inflate(data, limit);
      if (raw.length > limit) throw tooLarge(limit);
      return raw.toString("utf8").replace(/^\uFEFF/, "");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error("PLZ register archive contains no CSV");
}

function parseRegister(csv: string): RegisterRow[] {
  const lines = csv.split(/\r?\n/);
  const header = lines[0].split(";");
  const col = (name: string): number => header.indexOf(name);
  const iLocality = col("Ortschaftsname");
  const iPlz = col("PLZ4");
  const iSuffix = col("Zusatzziffer");
  const iMunicipality = col("Gemeindename");
  const iBfs = col("BFS-Nr");
  const iCanton = col("Kantonskürzel");
  const iShare = col("Adressenanteil");
  if (iPlz < 0 || iCanton < 0) {
    throw new Error("PLZ register CSV has an unexpected header");
  }

  const rows: RegisterRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(";");
    const postcode = parseInt(f[iPlz], 10);
    if (!Number.isFinite(postcode)) continue;
    rows.push({
      postcode,
      suffix: f[iSuffix] ?? "00",
      locality: f[iLocality] ?? "",
      municipality: f[iMunicipality] ?? "",
      bfsNumber: parseInt(f[iBfs], 10),
      canton: (f[iCanton] ?? "").trim(),
      addressShare: parseFloat((f[iShare] ?? "").replace("%", "").trim()) || 0,
    });
  }
  return rows;
}

const register = cached(REGISTER_TTL_MS, async () => {
  const zip = await fetchBody(PLZ_REGISTER_URL, { timeoutMs: 60_000 }, async (response) =>
    Buffer.from(await response.arrayBuffer())
  );
  return parseRegister(readCsvFromZip(zip));
});

export function clearPostCache(): void {
  register.clear();
}

function loadRegister(): Promise<RegisterRow[]> {
  return register.get();
}

/** Canton holding most of a postcode's addresses, plus any others it reaches into. */
function cantonsForPostcode(rows: RegisterRow[], postcode: number): {
  primary: string | null;
  others: string[];
} {
  const share = new Map<string, number>();
  for (const r of rows) {
    if (r.postcode !== postcode || !r.canton) continue;
    share.set(r.canton, (share.get(r.canton) ?? 0) + r.addressShare);
  }
  const ranked = [...share.entries()].sort((a, b) => b[1] - a[1]);
  return {
    primary: ranked[0]?.[0] ?? null,
    others: ranked.slice(1).map(([code]) => code),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CANTON_NAMES_BY_CODE: Record<string, string> = {
  ZH: "Zürich", BE: "Bern", LU: "Luzern", UR: "Uri", SZ: "Schwyz",
  OW: "Obwalden", NW: "Nidwalden", GL: "Glarus", ZG: "Zug", FR: "Fribourg",
  SO: "Solothurn", BS: "Basel-Stadt", BL: "Basel-Landschaft", SH: "Schaffhausen",
  AR: "Appenzell Ausserrhoden", AI: "Appenzell Innerrhoden", SG: "St. Gallen",
  GR: "Graubünden", AG: "Aargau", TG: "Thurgau", TI: "Ticino", VD: "Vaud",
  VS: "Valais", NE: "Neuchâtel", GE: "Genève", JU: "Jura",
};

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
  const code = lower.toUpperCase();
  if (CANTON_NAMES_BY_CODE[code]) return code;
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
      "Locality, canton and coordinates for a postcode (PLZ)",
    inputSchema: {
      type: "object",
      required: ["postcode"],
      properties: {
        postcode: {
          type: "string",
          description: "4 digits, e.g. 8001",
        },
      },
    },
  },
  {
    name: "search_postcode",
    description:
      "Postcodes (PLZ) for a city/locality name",
    inputSchema: {
      type: "object",
      required: ["city_name"],
      properties: {
        city_name: {
          type: "string",
          description: "e.g. Zürich",
        },
      },
    },
  },
  {
    name: "list_postcodes_in_canton",
    description:
      "List postcodes (PLZ) in a canton",
    inputSchema: {
      type: "object",
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description:
            "Canton code (e.g. ZH) or name",
        },
      },
    },
  },
  {
    name: "track_parcel",
    description:
      "Swiss Post tracking page URL for a tracking number (no live status: there is no public tracking API)",
    inputSchema: {
      type: "object",
      required: ["tracking_number"],
      properties: {
        tracking_number: {
          type: "string",
          description:
            "e.g. 99.00.123456.12345678 (parcel), RI 123456789 CH (registered)",
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
        throw new Error(`No Swiss postcode ${postcode}. Use search_postcode to find one by place name.`);
      }

      const record = findData.results[0];
      const attr = record.attributes;

      // 2. Canton and municipality come from the register, which states them per locality.
      const register = await loadRegister().catch(() => null);
      const registerRows = register?.filter((r) => r.postcode === Number(postcode)) ?? [];
      const cantons = register ? cantonsForPostcode(register, Number(postcode)) : null;
      const mainRow = [...registerRows].sort((a, b) => b.addressShare - a.addressShare)[0];

      // 3. Get coordinates + confirm locality from SearchServer (zipcode origin)
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

      // 4. Fall back to a point-in-polygon lookup only if the register is unreachable.
      const fallback =
        !cantons?.primary && lat !== null && lon !== null
          ? await identifyCanton(lat, lon).catch(() => null)
          : null;
      const cantonCode = cantons?.primary ?? fallback?.code ?? null;

      return JSON.stringify({
        found: true,
        postcode: attr.plz,
        locality: attr.langtext,
        canton: cantonCode
          ? { code: cantonCode, name: fallback?.name ?? CANTON_NAMES_BY_CODE[cantonCode] ?? cantonCode }
          : null,
        also_in_cantons: cantons?.others.length ? cantons.others : undefined,
        municipality: mainRow
          ? { name: mainRow.municipality, bfs_number: mainRow.bfsNumber }
          : undefined,
        coordinates: lat !== null ? { lat, lon } : null,
        source: REGISTER_SOURCE,
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

      const register = await loadRegister().catch(() => null);

      const entries = findData.results.map((r) => ({
        postcode: r.attributes.plz,
        locality: r.attributes.langtext,
        canton: register ? cantonsForPostcode(register, r.attributes.plz).primary : undefined,
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
        source: REGISTER_SOURCE,
      });
    }

    // ── list_postcodes_in_canton ─────────────────────────────────────────────
    case "list_postcodes_in_canton": {
      const cantonInput = String(args.canton ?? "").trim();
      if (!cantonInput) {
        throw new Error("canton must not be empty.");
      }

      const cantonCode = resolveCantonCode(cantonInput);
      const register = await loadRegister();

      // The register states the canton per locality, so nothing here is inferred
      // from a bounding box. A postcode is listed for the canton that holds most
      // of its addresses; postcodes that only reach into the canton are separate.
      const byPostcode = new Map<number, { locality: string; shares: Map<string, number> }>();
      for (const row of register) {
        if (!row.canton) continue;
        let entry = byPostcode.get(row.postcode);
        if (!entry) {
          entry = { locality: row.locality, shares: new Map() };
          byPostcode.set(row.postcode, entry);
        }
        if (row.suffix === "00") entry.locality = row.locality;
        entry.shares.set(row.canton, (entry.shares.get(row.canton) ?? 0) + row.addressShare);
      }

      const postcodes: Array<{ postcode: number; locality: string }> = [];
      const partly: Array<{ postcode: number; locality: string; main_canton: string; share_percent: number }> = [];
      for (const [postcode, entry] of byPostcode) {
        const share = entry.shares.get(cantonCode);
        if (share === undefined) continue;
        const ranked = [...entry.shares.entries()].sort((a, b) => b[1] - a[1]);
        if (ranked[0][0] === cantonCode) {
          postcodes.push({ postcode, locality: entry.locality });
        } else {
          partly.push({
            postcode,
            locality: entry.locality,
            main_canton: ranked[0][0],
            share_percent: Math.round(share * 100) / 100,
          });
        }
      }
      postcodes.sort((a, b) => a.postcode - b.postcode);
      partly.sort((a, b) => a.postcode - b.postcode);

      return JSON.stringify({
        canton: { code: cantonCode, name: CANTON_NAMES_BY_CODE[cantonCode] },
        count: postcodes.length,
        postcodes,
        partly_in_canton: partly.length ? partly : undefined,
        note: partly.length
          ? "partly_in_canton lists postcodes whose addresses are mostly in another canton but that extend into this one."
          : undefined,
        source: REGISTER_SOURCE,
        source_url: PLZ_REGISTER_URL,
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
