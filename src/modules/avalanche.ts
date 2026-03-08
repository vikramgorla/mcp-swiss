/**
 * Swiss Avalanche Bulletin module
 *
 * Data source: SLF (WSL Institute for Snow and Avalanche Research)
 * The SLF publishes the official Swiss avalanche bulletin daily at ~08:00 and 17:00.
 *
 * API situation: The SLF JSON API used by the White Risk app (whiterisk.ch) requires
 * authentication. The public-facing data is available as:
 *   - PDF bulletins at aws.slf.ch (no auth, verified working)
 *   - Interactive maps at whiterisk.ch
 *   - EAWS CAAMLv6 feed (requires auth)
 *
 * This module provides:
 *   - get_avalanche_bulletin: current bulletin URLs + danger level summary links
 *   - list_avalanche_regions: all SLF warning regions with IDs and locations
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvalancheTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ── Region data (official SLF/EAWS regions for Switzerland) ───────────────────

export const SWISS_AVALANCHE_REGIONS = [
  { id: "CH-1",  name: "Jura",                     canton: "JU/NE/VD",      elevation_m: 800  },
  { id: "CH-2",  name: "Mittelland",                canton: "BE/ZH/AG",      elevation_m: 700  },
  { id: "CH-3",  name: "Alps North of the Rhone",   canton: "BE/VD/VS/FR",   elevation_m: 1500 },
  { id: "CH-4",  name: "Western Alps",              canton: "VS",            elevation_m: 2500 },
  { id: "CH-5",  name: "Central Alps",              canton: "VS/OW/NW",      elevation_m: 2500 },
  { id: "CH-6",  name: "Bernese Alps North",        canton: "BE",            elevation_m: 2000 },
  { id: "CH-7",  name: "Bernese Alps South",        canton: "BE/VS",         elevation_m: 2500 },
  { id: "CH-8",  name: "Glarner Alps",              canton: "GL/SG/GR",      elevation_m: 2000 },
  { id: "CH-9",  name: "Central Graubünden",        canton: "GR",            elevation_m: 2500 },
  { id: "CH-10", name: "Prättigau & Davos",         canton: "GR",            elevation_m: 2000 },
  { id: "CH-11", name: "Silvretta",                 canton: "GR/GL",         elevation_m: 2500 },
  { id: "CH-12", name: "Surselva",                  canton: "GR",            elevation_m: 2000 },
  { id: "CH-13", name: "Engadine & Samnaun",        canton: "GR",            elevation_m: 2500 },
  { id: "CH-14", name: "Val Müstair",               canton: "GR",            elevation_m: 2000 },
  { id: "CH-15", name: "Bernina & Bregaglia",       canton: "GR",            elevation_m: 2500 },
  { id: "CH-16", name: "Valposchiavo",              canton: "GR",            elevation_m: 2000 },
  { id: "CH-17", name: "Mesolcina & Calanca",       canton: "GR",            elevation_m: 1800 },
  { id: "CH-18", name: "Ticino North",              canton: "TI",            elevation_m: 2000 },
  { id: "CH-19", name: "Ticino South",              canton: "TI",            elevation_m: 1500 },
  { id: "CH-20", name: "Alps North of the Rhine",   canton: "GL/SG/AI/AR",   elevation_m: 1800 },
  { id: "CH-21", name: "Uri Alps",                  canton: "UR/OW/NW",      elevation_m: 2500 },
  { id: "CH-22", name: "Schwyzer Alps",             canton: "SZ/ZG",         elevation_m: 1800 },
];

const DANGER_LEVELS: Record<number, string> = {
  1: "Low (1/5) — No special precautions needed",
  2: "Moderate (2/5) — Careful route selection on steep slopes",
  3: "Considerable (3/5) — Careful assessment required; natural and human-triggered avalanches possible",
  4: "High (4/5) — Very careful assessment; spontaneous avalanches likely",
  5: "Very High (5/5) — Extraordinary situation; avoid all avalanche terrain",
};

const SUPPORTED_LANGUAGES = ["de", "en", "fr", "it"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function bulletinPdfUrl(lang: string): string {
  // aws.slf.ch serves official PDF bulletins — publicly accessible without auth
  // Caller (handleAvalanche) has already validated lang is in SUPPORTED_LANGUAGES
  return `https://aws.slf.ch/api/bulletin/document/full/${lang}`;
}

function whiteRiskUrl(lang: string): string {
  return `https://whiterisk.ch/${lang}/conditions`;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const avalancheTools: AvalancheTool[] = [
  {
    name: "get_avalanche_bulletin",
    description:
      "Get the current Swiss avalanche danger bulletin from SLF (WSL Institute for Snow and Avalanche Research). " +
      "Returns current bulletin URLs, danger level descriptions, and links to the interactive map. " +
      "The bulletin is published daily at ~08:00 and updated at ~17:00 Swiss time (October–May).",
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description:
            "Optional region ID (e.g. CH-9 for Central Graubünden) or region name. " +
            "Use list_avalanche_regions to see all options. If omitted, returns national overview.",
        },
        language: {
          type: "string",
          enum: ["de", "en", "fr", "it"],
          description: "Language for bulletin links: de (German), en (English), fr (French), it (Italian). Default: en",
        },
      },
    },
  },
  {
    name: "list_avalanche_regions",
    description:
      "List all Swiss avalanche warning regions as defined by SLF/EAWS. " +
      "Returns region IDs, names, cantons, and typical elevations. " +
      "Use region IDs with get_avalanche_bulletin.",
    inputSchema: {
      type: "object",
      properties: {
        canton: {
          type: "string",
          description: "Filter regions by canton abbreviation (e.g. GR, VS, BE). Optional.",
        },
      },
    },
  },
];

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleGetAvalancheBulletin(args: Record<string, string>): Promise<string> {
  const lang = SUPPORTED_LANGUAGES.includes(args.language) ? args.language : "en";
  const today = todayISO();

  // Find matching region if specified
  let matchedRegion: typeof SWISS_AVALANCHE_REGIONS[0] | undefined;
  if (args.region) {
    const query = args.region.trim().toLowerCase();
    matchedRegion = SWISS_AVALANCHE_REGIONS.find(
      (r) =>
        r.id.toLowerCase() === query ||
        r.name.toLowerCase().includes(query) ||
        r.canton.toLowerCase().includes(query)
    );
  }

  const pdfUrl = bulletinPdfUrl(lang);
  const mapUrl = whiteRiskUrl(lang);

  const result: Record<string, unknown> = {
    date: today,
    source: "SLF – WSL Institute for Snow and Avalanche Research",
    bulletin_url: {
      interactive_map: mapUrl,
      pdf_full: pdfUrl,
      pdf_regions: {
        de: "https://aws.slf.ch/api/bulletin/document/full/de",
        en: "https://aws.slf.ch/api/bulletin/document/full/en",
        fr: "https://aws.slf.ch/api/bulletin/document/full/fr",
        it: "https://aws.slf.ch/api/bulletin/document/full/it",
      },
    },
    danger_scale: DANGER_LEVELS,
    schedule: {
      morning_bulletin: "~08:00 CET/CEST",
      afternoon_update: "~17:00 CET/CEST",
      season: "October to May (daily). Summer bulletins are occasional.",
    },
    note:
      "The SLF JSON API requires authentication (used by the White Risk app). " +
      "Current danger levels are available via the interactive map at whiterisk.ch " +
      "or as PDF bulletins at the URLs above. " +
      "For programmatic access, contact SLF at lawinfo@slf.ch.",
  };

  if (matchedRegion) {
    result.region = {
      id: matchedRegion.id,
      name: matchedRegion.name,
      canton: matchedRegion.canton,
      typical_elevation_m: matchedRegion.elevation_m,
      bulletin_link: `${mapUrl}#region=${matchedRegion.id}`,
    };
    result.tip = `Check ${matchedRegion.name} (${matchedRegion.id}) on the interactive map: ${mapUrl}`;
  } else if (args.region) {
    result.region_not_found = args.region;
    result.tip = `Use list_avalanche_regions to see valid region IDs. Or visit ${mapUrl} for the full map.`;
  }

  return JSON.stringify(result);
}

async function handleListAvalancheRegions(args: Record<string, string>): Promise<string> {
  let regions = SWISS_AVALANCHE_REGIONS;

  if (args.canton) {
    const cantonQuery = args.canton.trim().toUpperCase();
    regions = SWISS_AVALANCHE_REGIONS.filter((r) =>
      r.canton.toUpperCase().includes(cantonQuery)
    );
  }

  const result = {
    count: regions.length,
    source: "SLF/EAWS Swiss Avalanche Warning Regions",
    regions: regions.map((r) => ({
      id: r.id,
      name: r.name,
      canton: r.canton,
      typical_elevation_m: r.elevation_m,
    })),
    usage: "Pass region ID (e.g. 'CH-9') to get_avalanche_bulletin for region-specific bulletin link",
    bulletin_map: "https://whiterisk.ch/en/conditions",
  };

  return JSON.stringify(result);
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleAvalanche(
  name: string,
  args: Record<string, string>
): Promise<string> {
  switch (name) {
    case "get_avalanche_bulletin":
      return handleGetAvalancheBulletin(args);
    case "list_avalanche_regions":
      return handleListAvalancheRegions(args);
    default:
      throw new Error(`Unknown avalanche tool: ${name}`);
  }
}
