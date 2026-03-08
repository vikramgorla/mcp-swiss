/**
 * Test fixtures for the Swiss Avalanche Bulletin module
 */

// Mirrors the SWISS_AVALANCHE_REGIONS structure from the module
export const mockRegions = [
  { id: "CH-1",  name: "Jura",                     canton: "JU/NE/VD",      elevation_m: 800  },
  { id: "CH-9",  name: "Central Graubünden",        canton: "GR",            elevation_m: 2500 },
  { id: "CH-4",  name: "Western Alps",              canton: "VS",            elevation_m: 2500 },
  { id: "CH-18", name: "Ticino North",              canton: "TI",            elevation_m: 2000 },
  { id: "CH-21", name: "Uri Alps",                  canton: "UR/OW/NW",      elevation_m: 2500 },
];

// Expected bulletin result shape
export const mockBulletinResult = {
  date: "2026-03-08",
  source: "SLF – WSL Institute for Snow and Avalanche Research",
  bulletin_url: {
    interactive_map: "https://whiterisk.ch/en/conditions",
    pdf_full: "https://aws.slf.ch/api/bulletin/document/full/en",
    pdf_regions: {
      de: "https://aws.slf.ch/api/bulletin/document/full/de",
      en: "https://aws.slf.ch/api/bulletin/document/full/en",
      fr: "https://aws.slf.ch/api/bulletin/document/full/fr",
      it: "https://aws.slf.ch/api/bulletin/document/full/it",
    },
  },
  danger_scale: {
    1: "Low (1/5) — No special precautions needed",
    2: "Moderate (2/5) — Careful route selection on steep slopes",
    3: "Considerable (3/5) — Careful assessment required; natural and human-triggered avalanches possible",
    4: "High (4/5) — Very careful assessment; spontaneous avalanches likely",
    5: "Very High (5/5) — Extraordinary situation; avoid all avalanche terrain",
  },
  schedule: {
    morning_bulletin: "~08:00 CET/CEST",
    afternoon_update: "~17:00 CET/CEST",
    season: "October to May (daily). Summer bulletins are occasional.",
  },
  note: "The SLF JSON API requires authentication (used by the White Risk app). Current danger levels are available via the interactive map at whiterisk.ch or as PDF bulletins at the URLs above. For programmatic access, contact SLF at lawinfo@slf.ch.",
};

// Expected region-filtered result
export const mockBulletinWithRegion = {
  ...mockBulletinResult,
  region: {
    id: "CH-9",
    name: "Central Graubünden",
    canton: "GR",
    typical_elevation_m: 2500,
    bulletin_link: "https://whiterisk.ch/en/conditions#region=CH-9",
  },
  tip: "Check Central Graubünden (CH-9) on the interactive map: https://whiterisk.ch/en/conditions",
};

// Expected regions list result
export const mockRegionsList = {
  count: 22,
  source: "SLF/EAWS Swiss Avalanche Warning Regions",
  regions: mockRegions,
  usage: "Pass region ID (e.g. 'CH-9') to get_avalanche_bulletin for region-specific bulletin link",
  bulletin_map: "https://whiterisk.ch/en/conditions",
};
