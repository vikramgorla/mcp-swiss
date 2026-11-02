/**
 * SLF Avalanche Bulletin module
 *
 * Data source: WSL Institute for Snow and Avalanche Research SLF (CC BY 4.0)
 * API: aws.slf.ch/api — the bulletin endpoints are public; only
 * /api/bulletin-preview requires a bearer token.
 *
 * The bulletin follows the EAWS CAAMLv6 JSON schema: one entry per group of
 * warning regions that share a danger level, with the danger by elevation and
 * aspect carried on the avalanche problems rather than on the danger rating.
 *
 * Provides:
 *   - get_avalanche_bulletin: danger level, problems and texts for a region or point
 *   - list_avalanche_regions: the 135 SLF/EAWS warning regions
 */

import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://aws.slf.ch/api";

// ── CAAMLv6 response types ────────────────────────────────────────────────────

interface CaamlRegion {
  regionID: string;
  name?: string;
}

interface CaamlElevation {
  lowerBound?: number | string | null;
  upperBound?: number | string | null;
}

interface CaamlDangerRating {
  mainValue?: string;
  validTimePeriod?: string;
  elevation?: CaamlElevation | null;
  customData?: { CH?: { subdivision?: string | null } };
}

interface CaamlProblem {
  problemType?: string;
  dangerRatingValue?: string;
  aspects?: string[];
  elevation?: CaamlElevation | null;
  validTimePeriod?: string;
  comment?: string;
  customData?: { CH?: { coreZoneText?: string | null } };
}

interface CaamlTexts {
  highlights?: string;
  comment?: string;
}

interface CaamlBulletin {
  bulletinID?: string;
  lang?: string;
  validTime?: { startTime?: string; endTime?: string };
  nextUpdate?: string;
  publicationTime?: string;
  unscheduled?: boolean;
  regions?: CaamlRegion[];
  dangerRatings?: CaamlDangerRating[];
  avalancheProblems?: CaamlProblem[];
  highlights?: string;
  snowpackStructure?: CaamlTexts;
  weatherForecast?: CaamlTexts;
  travelAdvisory?: CaamlTexts;
  tendency?: CaamlTexts[];
}

interface CaamlCollection {
  bulletins?: CaamlBulletin[];
}

interface CaamlFeature {
  properties?: CaamlBulletin;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

interface CaamlFeatureCollection {
  features?: CaamlFeature[];
}

// ── Warning regions ───────────────────────────────────────────────────────────

/**
 * EAWS micro-regions SLF issues bulletins for, with the names SLF itself uses
 * (they are local toponyms and identical in all four bulletin languages).
 * The canton is the one containing the region's centre, from swisstopo
 * boundaries; CH-3311 is Liechtenstein, which SLF covers but has no canton.
 */
export const SWISS_AVALANCHE_REGIONS: Array<{ id: string; name: string; canton: string | null }> = [
  { id: "CH-1111", name: "Waadtländer Voralpen", canton: "VD" },
  { id: "CH-1112", name: "Pays d'Enhaut", canton: "VD" },
  { id: "CH-1113", name: "Aigle-Leysin", canton: "VD" },
  { id: "CH-1114", name: "Bex-Villars", canton: "VD" },
  { id: "CH-1121", name: "Jaun", canton: "FR" },
  { id: "CH-1122", name: "Gruyère", canton: "FR" },
  { id: "CH-1211", name: "westliche Berner Voralpen", canton: "BE" },
  { id: "CH-1212", name: "östliche Berner Voralpen", canton: "BE" },
  { id: "CH-1213", name: "Hohgant", canton: "BE" },
  { id: "CH-1221", name: "Niedersimmental", canton: "BE" },
  { id: "CH-1222", name: "Gstaad", canton: "BE" },
  { id: "CH-1223", name: "Wildhorn", canton: "BE" },
  { id: "CH-1224", name: "Lenk", canton: "BE" },
  { id: "CH-1225", name: "Iffigen", canton: "BE" },
  { id: "CH-1226", name: "Adelboden", canton: "BE" },
  { id: "CH-1227", name: "Engstligen", canton: "BE" },
  { id: "CH-1228", name: "Obersimmental", canton: "BE" },
  { id: "CH-1231", name: "Kandersteg", canton: "BE" },
  { id: "CH-1232", name: "Blüemlisalp", canton: "BE" },
  { id: "CH-1233", name: "Lauterbrunnen", canton: "BE" },
  { id: "CH-1234", name: "Jungfrau - Schilthorn", canton: "BE" },
  { id: "CH-1241", name: "Brienz-Interlaken", canton: "BE" },
  { id: "CH-1242", name: "Grindelwald", canton: "BE" },
  { id: "CH-1243", name: "Schreckhorn", canton: "BE" },
  { id: "CH-1244", name: "Hasliberg - Rosenlaui", canton: "BE" },
  { id: "CH-1245", name: "Guttannen", canton: "BE" },
  { id: "CH-1246", name: "Gadmertal", canton: "BE" },
  { id: "CH-1247", name: "Grimselpass", canton: "BE" },
  { id: "CH-1311", name: "Vouvry", canton: "VS" },
  { id: "CH-1312", name: "Monthey-Val d'Illiez", canton: "VS" },
  { id: "CH-2111", name: "Pilatus", canton: "OW" },
  { id: "CH-2112", name: "Schwarzenberg", canton: "LU" },
  { id: "CH-2121", name: "Glaubenberg", canton: "OW" },
  { id: "CH-2122", name: "Engelberg", canton: "OW" },
  { id: "CH-2123", name: "Melchtal", canton: "OW" },
  { id: "CH-2124", name: "Gersau", canton: "NW" },
  { id: "CH-2131", name: "Rothenthurm", canton: "ZG" },
  { id: "CH-2132", name: "Ybrig", canton: "SZ" },
  { id: "CH-2133", name: "Stoos", canton: "SZ" },
  { id: "CH-2134", name: "Bisistal", canton: "SZ" },
  { id: "CH-2211", name: "Schächental", canton: "UR" },
  { id: "CH-2212", name: "Uri Rot Stock", canton: "UR" },
  { id: "CH-2221", name: "Meiental", canton: "UR" },
  { id: "CH-2222", name: "Maderanertal", canton: "UR" },
  { id: "CH-2223", name: "nördliches Urseren", canton: "UR" },
  { id: "CH-2224", name: "südliches Urseren", canton: "UR" },
  { id: "CH-3111", name: "Glarus Nord", canton: "GL" },
  { id: "CH-3112", name: "Glarus Süd-Grosstal", canton: "GL" },
  { id: "CH-3113", name: "Glarus Süd-Sernftal", canton: "GL" },
  { id: "CH-3114", name: "Glarus Mitte", canton: "GL" },
  { id: "CH-3211", name: "Appenzeller Alpen", canton: "AR" },
  { id: "CH-3221", name: "Toggenburg", canton: "SG" },
  { id: "CH-3222", name: "Alpstein - Alvier", canton: "SG" },
  { id: "CH-3223", name: "Flumserberg", canton: "SG" },
  { id: "CH-3224", name: "Sarganserland", canton: "SG" },
  { id: "CH-3311", name: "Liechtenstein", canton: null },
  { id: "CH-4111", name: "Emosson", canton: "VS" },
  { id: "CH-4112", name: "Génépi", canton: "VS" },
  { id: "CH-4113", name: "Val d'Entremont-Val Ferret", canton: "VS" },
  { id: "CH-4114", name: "Conthey-Fully", canton: "VS" },
  { id: "CH-4115", name: "Martigny-Verbier", canton: "VS" },
  { id: "CH-4116", name: "Haut Val de Bagnes", canton: "VS" },
  { id: "CH-4121", name: "Montana", canton: "VS" },
  { id: "CH-4122", name: "Val d'Hérens", canton: "VS" },
  { id: "CH-4123", name: "Arolla", canton: "VS" },
  { id: "CH-4124", name: "Val d'Anniviers", canton: "VS" },
  { id: "CH-4125", name: "Mountet", canton: "VS" },
  { id: "CH-4211", name: "Leukerbad - Lötschental", canton: "VS" },
  { id: "CH-4212", name: "Turtmanntal", canton: "VS" },
  { id: "CH-4213", name: "Konkordia Gebiet", canton: "VS" },
  { id: "CH-4214", name: "Riederalp", canton: "VS" },
  { id: "CH-4215", name: "Leuk", canton: "VS" },
  { id: "CH-4221", name: "untere Vispertäler", canton: "VS" },
  { id: "CH-4222", name: "Zermatt", canton: "VS" },
  { id: "CH-4223", name: "Saas Fee", canton: "VS" },
  { id: "CH-4224", name: "Monte Rosa", canton: "VS" },
  { id: "CH-4225", name: "Mattmark", canton: "VS" },
  { id: "CH-4231", name: "nördliches Simplon Gebiet", canton: "VS" },
  { id: "CH-4232", name: "südliches Simplon Gebiet", canton: "VS" },
  { id: "CH-4241", name: "Reckingen", canton: "VS" },
  { id: "CH-4242", name: "Binntal", canton: "VS" },
  { id: "CH-4243", name: "nördliches Obergoms", canton: "VS" },
  { id: "CH-4244", name: "südliches Obergoms", canton: "VS" },
  { id: "CH-5111", name: "nördliches Prättigau", canton: "GR" },
  { id: "CH-5112", name: "südliches Prättigau", canton: "GR" },
  { id: "CH-5113", name: "westliche Silvretta", canton: "GR" },
  { id: "CH-5121", name: "Calanda", canton: "GR" },
  { id: "CH-5122", name: "Schanfigg", canton: "GR" },
  { id: "CH-5123", name: "Davos", canton: "GR" },
  { id: "CH-5124", name: "Flims", canton: "GR" },
  { id: "CH-5211", name: "nördliches Tujetsch", canton: "GR" },
  { id: "CH-5212", name: "südliches Tujetsch", canton: "GR" },
  { id: "CH-5214", name: "Obersaxen - Safiental", canton: "GR" },
  { id: "CH-5215", name: "Val Sumvitg", canton: "GR" },
  { id: "CH-5216", name: "Zervreila", canton: "GR" },
  { id: "CH-5221", name: "Domleschg - Lenzerheide", canton: "GR" },
  { id: "CH-5222", name: "Schams", canton: "GR" },
  { id: "CH-5223", name: "Rheinwald", canton: "GR" },
  { id: "CH-5231", name: "Albulatal", canton: "GR" },
  { id: "CH-5232", name: "Savognin", canton: "GR" },
  { id: "CH-5233", name: "Avers", canton: "GR" },
  { id: "CH-5234", name: "Bivio", canton: "GR" },
  { id: "CH-6111", name: "Bedrettotal", canton: "TI" },
  { id: "CH-6112", name: "obere Leventina", canton: "TI" },
  { id: "CH-6113", name: "Bleniotal", canton: "TI" },
  { id: "CH-6114", name: "obere Maggiatäler", canton: "TI" },
  { id: "CH-6115", name: "untere Leventina", canton: "TI" },
  { id: "CH-6121", name: "untere Maggiatäler", canton: "TI" },
  { id: "CH-6122", name: "Riviera", canton: "TI" },
  { id: "CH-6131", name: "Luganese", canton: "TI" },
  { id: "CH-6132", name: "Mendrisiotto", canton: "TI" },
  { id: "CH-6211", name: "alto Moesano", canton: "GR" },
  { id: "CH-6212", name: "basso Moesano", canton: "GR" },
  { id: "CH-7111", name: "Corvatsch", canton: "GR" },
  { id: "CH-7112", name: "Bernina", canton: "GR" },
  { id: "CH-7113", name: "Zuoz", canton: "GR" },
  { id: "CH-7114", name: "St. Moritz", canton: "GR" },
  { id: "CH-7115", name: "Val Chamuera", canton: "GR" },
  { id: "CH-7121", name: "Samnaun", canton: "GR" },
  { id: "CH-7122", name: "östliche Silvretta", canton: "GR" },
  { id: "CH-7123", name: "Sur Tasna", canton: "GR" },
  { id: "CH-7124", name: "Val Suot", canton: "GR" },
  { id: "CH-7125", name: "Val dal Spöl", canton: "GR" },
  { id: "CH-7126", name: "Val S-charl", canton: "GR" },
  { id: "CH-7211", name: "Bergell", canton: "GR" },
  { id: "CH-7221", name: "oberes Puschlav", canton: "GR" },
  { id: "CH-7222", name: "unteres Puschlav", canton: "GR" },
  { id: "CH-7231", name: "Münstertal", canton: "GR" },
  { id: "CH-8111", name: "Saint-Cergue", canton: "VD" },
  { id: "CH-8112", name: "Vallée de Joux", canton: "VD" },
  { id: "CH-8113", name: "Yverdon - Bevaix", canton: "VD" },
  { id: "CH-8114", name: "Val de Travers", canton: "NE" },
  { id: "CH-8211", name: "Val de Ruz - Colombier", canton: "NE" },
  { id: "CH-8212", name: "Bienne - Neuchâtel", canton: "NE" },
  { id: "CH-8213", name: "Vallon de Saint-Imier", canton: "BE" },
];

const LANGUAGES = ["de", "en", "fr", "it"];

/** EAWS rating names on the 1-5 scale. "no_rating" and "no_snow" have no number. */
const DANGER_LEVELS: Record<string, number> = {
  low: 1,
  moderate: 2,
  considerable: 3,
  high: 4,
  very_high: 5,
};

const DANGER_SCALE: Record<number, string> = {
  1: "Low — generally safe conditions, isolated danger spots on very steep terrain",
  2: "Moderate — careful route selection on steep slopes of the indicated aspect and elevation",
  3: "Considerable — critical, careful assessment needed; avoid very steep slopes",
  4: "High — very unfavourable, stay on moderately steep terrain and watch runout zones",
  5: "Very high — extraordinary situation, avoid avalanche terrain entirely",
};

const SEASON =
  "SLF publishes the bulletin twice daily (~08:00 and ~17:00) through the winter season: " +
  "daily from about December to mid-May, intermittently from late October, none in summer.";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickLanguage(value: unknown): string {
  const lang = String(value ?? "").toLowerCase();
  return LANGUAGES.includes(lang) ? lang : "en";
}

function stripHtml(text: string | undefined | null, maxChars: number): string | undefined {
  if (!text) return undefined;
  const plain = text
    .replace(/<\/h\d>/gi, ": ")
    .replace(/<\/(p|li|div)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return undefined;
  return plain.length > maxChars ? `${plain.slice(0, maxChars - 1).trimEnd()}…` : plain;
}

/** CAAML elevation bounds are numbers, numeric strings or the token "treeline". */
function elevationBand(elevation: CaamlElevation | null | undefined): string | undefined {
  if (!elevation) return undefined;
  const label = (bound: number | string) =>
    String(bound) === "treeline" ? "the treeline" : `${bound} m`;
  const { lowerBound: low, upperBound: high } = elevation;
  if (low != null && high != null) return `between ${label(low)} and ${label(high)}`;
  if (low != null) return `above ${label(low)}`;
  if (high != null) return `below ${label(high)}`;
  return undefined;
}

function dangerOf(rating: CaamlDangerRating) {
  const value = rating.mainValue ?? "no_rating";
  return {
    level: DANGER_LEVELS[value] ?? null,
    label: value,
    // SLF splits each level into a low/mid/high third; EAWS has no field for it.
    within_level: rating.customData?.CH?.subdivision ?? undefined,
    elevation: elevationBand(rating.elevation) ?? undefined,
    // "all_day", or "earlier"/"later" when the danger changes during the day.
    period: rating.validTimePeriod ?? undefined,
  };
}

function problemsOf(bulletin: CaamlBulletin) {
  return (bulletin.avalancheProblems ?? []).map((problem) => ({
    type: problem.problemType,
    danger_level: problem.dangerRatingValue ? DANGER_LEVELS[problem.dangerRatingValue] ?? null : null,
    aspects: problem.aspects?.length ? problem.aspects : undefined,
    elevation: elevationBand(problem.elevation) ?? undefined,
    period: problem.validTimePeriod ?? undefined,
    core_zone: problem.customData?.CH?.coreZoneText ?? undefined,
    advice: stripHtml(problem.comment, 700),
  }));
}

function sourceLinks(lang: string) {
  return {
    provider: "SLF – WSL Institute for Snow and Avalanche Research (CC BY 4.0)",
    api: `${BASE}/bulletin/caaml/${lang}/json`,
    map: `https://whiterisk.ch/${lang}/conditions`,
    pdf: `${BASE}/bulletin/document/full/${lang}`,
  };
}

/** Ray casting against one linear ring, in [lon, lat] order. */
function inRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lon: number, lat: number, rings: number[][][]): boolean {
  if (!rings.length || !inRing(lon, lat, rings[0])) return false;
  return !rings.slice(1).some((hole) => inRing(lon, lat, hole));
}

function featureContains(feature: CaamlFeature, lon: number, lat: number): boolean {
  const geometry = feature.geometry;
  if (!geometry?.coordinates) return false;
  if (geometry.type === "Polygon") return inPolygon(lon, lat, geometry.coordinates as number[][][]);
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).some((poly) => inPolygon(lon, lat, poly));
  }
  return false;
}

function findRegion(query: string) {
  const needle = query.trim().toLowerCase();
  return (
    SWISS_AVALANCHE_REGIONS.find((r) => r.id.toLowerCase() === needle) ??
    SWISS_AVALANCHE_REGIONS.find((r) => r.name.toLowerCase() === needle) ??
    SWISS_AVALANCHE_REGIONS.find((r) => r.name.toLowerCase().includes(needle))
  );
}

/**
 * `activeAt` accepts any ISO timestamp. A bare date is read as midday local,
 * so a date alone lands on the morning bulletin rather than the previous
 * evening's update.
 */
function activeAtParam(date: unknown): string | undefined {
  const raw = String(date ?? "").trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T11:00:00Z`;
  if (Number.isNaN(Date.parse(raw))) throw new Error(`Invalid date: ${raw} (use YYYY-MM-DD or an ISO timestamp)`);
  return new Date(raw).toISOString();
}

/** Most recent released bulletin, so the off-season answer can say when it ended. */
async function lastPublished(lang: string) {
  try {
    const list = await fetchJSON<CaamlCollection[]>(
      buildUrl(`${BASE}/bulletin-list/caaml/${lang}/json`, { limit: 1 }),
      { timeoutMs: 45_000 }
    );
    const bulletin = list?.[0]?.bulletins?.[0];
    if (!bulletin) return undefined;
    return {
      published: bulletin.publicationTime,
      valid_until: bulletin.validTime?.endTime,
    };
  } catch {
    return undefined;
  }
}

async function noBulletin(lang: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    bulletin_in_force: false,
    note: "No avalanche bulletin is in force right now.",
    season: SEASON,
    last_bulletin: await lastPublished(lang),
    ...extra,
    source: sourceLinks(lang),
  });
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const avalancheTools = [
  {
    name: "get_avalanche_bulletin",
    description:
      "Live SLF avalanche bulletin: danger level (1-5), avalanche problems with aspect and elevation, validity and advice text, for one warning region, a coordinate, or all of Switzerland. Outside the winter season it reports that no bulletin is in force",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "EAWS region id (e.g. CH-7114) or name, see list_avalanche_regions",
        },
        lat: {
          type: "number",
          description: "WGS84 latitude, with lon; alternative to region",
        },
        lon: {
          type: "number",
          description: "WGS84 longitude, with lat",
        },
        language: {
          type: "string",
          enum: ["de", "en", "fr", "it"],
          default: "en",
        },
        date: {
          type: "string",
          description: "YYYY-MM-DD or ISO timestamp for an archived bulletin; omit for the current one",
        },
      },
    },
  },
  {
    name: "list_avalanche_regions",
    description:
      "The 135 SLF/EAWS avalanche warning regions (id, name, canton) for get_avalanche_bulletin",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Match on region id or name",
        },
        canton: {
          type: "string",
          description: "Canton code, e.g. GR",
        },
      },
    },
  },
];

// ── Handlers ──────────────────────────────────────────────────────────────────

async function getAvalancheBulletin(args: Record<string, unknown>): Promise<string> {
  const lang = pickLanguage(args.language);
  const activeAt = activeAtParam(args.date);
  const lat = args.lat === undefined || args.lat === "" ? undefined : Number(args.lat);
  const lon = args.lon === undefined || args.lon === "" ? undefined : Number(args.lon);
  const hasPoint = lat !== undefined && lon !== undefined;

  if (hasPoint && (!Number.isFinite(lat) || !Number.isFinite(lon))) {
    throw new Error("lat and lon must be numbers");
  }
  if ((lat === undefined) !== (lon === undefined)) {
    throw new Error("lat and lon must be given together");
  }

  const region = args.region ? findRegion(String(args.region)) : undefined;
  if (args.region && !region) {
    throw new Error(
      `Unknown region: ${String(args.region)}. Use list_avalanche_regions to find the id or name.`
    );
  }

  // The geojson variant carries the same bulletin fields plus the region
  // outlines, so it is only worth its extra size when resolving a point.
  const path = hasPoint ? `caaml/${lang}/geojson` : `caaml/${lang}/json`;
  const url = buildUrl(`${BASE}/bulletin/${path}`, { activeAt });
  const payload = await fetchJSON<CaamlCollection & CaamlFeatureCollection>(url, { timeoutMs: 45_000 });

  const features = payload.features ?? [];
  const bulletins = hasPoint
    ? features.map((f) => f.properties).filter((b): b is CaamlBulletin => Boolean(b))
    : payload.bulletins ?? [];

  if (bulletins.length === 0) {
    return noBulletin(lang, { requested: { region: region?.id, lat, lon, date: args.date } });
  }

  let selected: CaamlBulletin | undefined;
  // A coordinate wins over a region name, so the answer never labels the point
  // with a region it did not fall in.
  let matchedRegion = hasPoint ? undefined : region;

  if (hasPoint) {
    const feature = features.find((f) => featureContains(f, lon as number, lat as number));
    if (!feature) {
      return JSON.stringify({
        bulletin_in_force: true,
        note: `No warning region covers ${lat}, ${lon}. The bulletin only covers the Swiss Alps, the Jura and Liechtenstein.`,
        source: sourceLinks(lang),
      });
    }
    selected = feature.properties;
  } else if (region) {
    selected = bulletins.find((b) => b.regions?.some((r) => r.regionID === region.id));
    if (!selected) {
      return noBulletin(lang, {
        note: `No bulletin covers ${region.id} (${region.name}) for this date. SLF omits regions without enough snow.`,
        requested: { region: region.id, date: args.date },
      });
    }
  }

  if (!selected) {
    // No region and no point: one line per bulletin, no long texts.
    const first = bulletins[0];
    return JSON.stringify({
      bulletin_in_force: true,
      scope: "Switzerland",
      valid: first.validTime,
      published: first.publicationTime,
      next_update: first.nextUpdate,
      areas: bulletins.map((b) => ({
        danger: (b.dangerRatings ?? []).map(dangerOf),
        problems: (b.avalancheProblems ?? []).map((p) => p.problemType),
        regions: (b.regions ?? []).map((r) => ({ id: r.regionID, name: r.name })),
      })),
      danger_scale: DANGER_SCALE,
      hint: "Pass region or lat/lon for the problems, elevations and advice text.",
      source: sourceLinks(lang),
    });
  }

  if (hasPoint) {
    // Name the region the point fell in, when the bulletin lists only one.
    const ids = (selected.regions ?? []).map((r) => r.regionID);
    if (ids.length === 1) matchedRegion = findRegion(ids[0]) ?? matchedRegion;
  }

  const ratings = selected.dangerRatings ?? [];
  const allDay = ratings.find((r) => r.validTimePeriod === "all_day") ?? ratings[0];

  return JSON.stringify({
    bulletin_in_force: true,
    region: matchedRegion
      ? { id: matchedRegion.id, name: matchedRegion.name, canton: matchedRegion.canton }
      : undefined,
    point: hasPoint ? { lat, lon } : undefined,
    danger: allDay ? dangerOf(allDay) : undefined,
    danger_by_period: ratings.length > 1 ? ratings.map(dangerOf) : undefined,
    problems: problemsOf(selected),
    valid: selected.validTime,
    published: selected.publicationTime,
    next_update: selected.nextUpdate,
    unscheduled: selected.unscheduled || undefined,
    highlights: stripHtml(selected.highlights, 300),
    snowpack: stripHtml(selected.snowpackStructure?.comment, 700),
    weather_outlook: stripHtml(selected.weatherForecast?.comment, 500),
    tendency: stripHtml(selected.tendency?.[0]?.comment, 500),
    covers_regions: (selected.regions ?? []).map((r) => r.regionID),
    danger_scale: DANGER_SCALE,
    source: sourceLinks(lang),
  });
}

function listAvalancheRegions(args: Record<string, unknown>): string {
  let regions = SWISS_AVALANCHE_REGIONS;

  const canton = String(args.canton ?? "").trim().toUpperCase();
  if (canton) regions = regions.filter((r) => r.canton === canton);

  const search = String(args.search ?? "").trim().toLowerCase();
  if (search) {
    regions = regions.filter(
      (r) => r.id.toLowerCase().includes(search) || r.name.toLowerCase().includes(search)
    );
  }

  return JSON.stringify({
    count: regions.length,
    total: SWISS_AVALANCHE_REGIONS.length,
    regions,
    note: "Region names are local toponyms and are the same in all four bulletin languages. CH-3311 is Liechtenstein, which the SLF bulletin also covers.",
    source: "SLF avalanche bulletin (EAWS micro-regions), cantons from swisstopo boundaries",
  });
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleAvalanche(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_avalanche_bulletin":
      return getAvalancheBulletin(args);
    case "list_avalanche_regions":
      return listAvalancheRegions(args);
    default:
      throw new Error(`Unknown avalanche tool: ${name}`);
  }
}
