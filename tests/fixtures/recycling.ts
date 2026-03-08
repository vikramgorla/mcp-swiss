// Mock data matching real openerz.metaodi.ch API structure

export interface OpenErzEntry {
  date: string;
  waste_type: string;
  zip: number;
  area: string;
  station: string;
  region: string;
  description: string;
}

export interface OpenErzResponse {
  _metadata: { total_count: number; row_count: number };
  result: OpenErzEntry[];
}

// ── Base entry factory ───────────────────────────────────────────────────────

function entry(date: string, waste_type: string, zip = 8001, description = ""): OpenErzEntry {
  return { date, waste_type, zip, area: String(zip), station: "", region: "zurich", description };
}

// ── Fixtures for get_waste_collection ────────────────────────────────────────

/** Upcoming cardboard collections for ZIP 8001 */
export const mockUpcomingCardboard: OpenErzResponse = {
  _metadata: { total_count: 5, row_count: 5 },
  result: [
    entry("2026-03-12", "cardboard"),
    entry("2026-03-19", "cardboard"),
    entry("2026-03-26", "cardboard"),
    entry("2026-04-02", "cardboard"),
    entry("2026-04-09", "cardboard"),
  ],
};

/** Upcoming mixed-type collections for ZIP 8001 (all types) */
export const mockUpcomingAll: OpenErzResponse = {
  _metadata: { total_count: 10, row_count: 10 },
  result: [
    entry("2026-03-09", "organic"),
    entry("2026-03-10", "waste"),
    entry("2026-03-12", "cardboard"),
    entry("2026-03-13", "paper"),
    entry("2026-03-16", "organic"),
    entry("2026-03-17", "waste"),
    entry("2026-03-19", "cardboard"),
    entry("2026-03-20", "textile"),
    entry("2026-03-23", "organic"),
    entry("2026-03-24", "special"),
  ],
};

/** Entry with a non-empty description */
export const mockUpcomingWithDescription: OpenErzResponse = {
  _metadata: { total_count: 1, row_count: 1 },
  result: [
    { ...entry("2026-04-01", "special"), description: "Hazardous materials — bring to mobile station" },
  ],
};

/** Empty result */
export const mockEmptyResult: OpenErzResponse = {
  _metadata: { total_count: 0, row_count: 0 },
  result: [],
};

// ── Fixtures for get_waste_calendar ─────────────────────────────────────────

/** March 2026 full calendar for ZIP 8001 */
export const mockMarchCalendar: OpenErzResponse = {
  _metadata: { total_count: 20, row_count: 20 },
  result: [
    entry("2026-03-02", "organic"),
    entry("2026-03-03", "waste"),
    entry("2026-03-05", "cardboard"),
    entry("2026-03-06", "paper"),
    entry("2026-03-09", "organic"),
    entry("2026-03-10", "waste"),
    entry("2026-03-12", "cardboard"),
    entry("2026-03-13", "paper"),
    entry("2026-03-16", "organic"),
    entry("2026-03-17", "waste"),
    entry("2026-03-19", "cardboard"),
    entry("2026-03-20", "textile"),
    entry("2026-03-23", "organic"),
    entry("2026-03-24", "waste"),
    entry("2026-03-26", "cardboard"),
    entry("2026-03-27", "paper"),
    entry("2026-03-30", "organic"),
    entry("2026-03-31", "waste"),
    // One day with multiple types
    entry("2026-03-14", "mobile"),
    entry("2026-03-14", "special"),
  ],
};

/** Single day with two types (for grouping test) */
export const mockMultiTypeDay: OpenErzResponse = {
  _metadata: { total_count: 2, row_count: 2 },
  result: [
    entry("2026-04-01", "organic"),
    entry("2026-04-01", "waste"),
  ],
};

/** February 2026 (28 days — non-leap year check) */
export const mockFebruaryCalendar: OpenErzResponse = {
  _metadata: { total_count: 4, row_count: 4 },
  result: [
    entry("2026-02-02", "organic"),
    entry("2026-02-09", "cardboard"),
    entry("2026-02-16", "organic"),
    entry("2026-02-23", "cardboard"),
  ],
};
