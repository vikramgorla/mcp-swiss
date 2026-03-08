// Mock data matching real BFS PxWeb and opendata.swiss API structures

// ── PxWeb: Switzerland total ─────────────────────────────────────────────────

export const mockPxWebSwitzerlandTotal = {
  columns: [
    { code: "Jahr", text: "Year", type: "t" },
    { code: "Bevölkerungstyp", text: "Population type", type: "d" },
    { code: "Staatsangehörigkeit (Kategorie)", text: "Citizenship (category)", type: "d" },
    { code: "Geschlecht", text: "Sex", type: "d" },
    { code: "Alter", text: "Age", type: "d" },
    { code: "Permanent and non permanent resident population", text: "Population", type: "c" },
  ],
  comments: [],
  data: [
    { key: ["2024", "1", "-99999", "-99999", "-99999"], values: ["9051029"] },
  ],
  metadata: [],
};

// ── PxWeb: Single canton (ZH) ────────────────────────────────────────────────

export const mockPxWebCantonZH = {
  columns: [
    { code: "Jahr", text: "Year", type: "t" },
    { code: "Kanton (-) / Bezirk (>>) / Gemeinde (......)", text: "Canton", type: "d" },
    { code: "Bevölkerungstyp", text: "Population type", type: "d" },
    { code: "Staatsangehörigkeit (Kategorie)", text: "Citizenship (category)", type: "d" },
    { code: "Geschlecht", text: "Sex", type: "d" },
    { code: "Alter", text: "Age", type: "d" },
    { code: "Permanent and non permanent resident population", text: "Population", type: "c" },
  ],
  comments: [],
  data: [
    { key: ["2024", "ZH", "1", "-99999", "-99999", "-99999"], values: ["1620020"] },
  ],
  metadata: [],
};

// ── PxWeb: All cantons ───────────────────────────────────────────────────────

export const mockPxWebAllCantons = {
  columns: [
    { code: "Jahr", text: "Year", type: "t" },
    { code: "Kanton (-) / Bezirk (>>) / Gemeinde (......)", text: "Canton", type: "d" },
    { code: "Bevölkerungstyp", text: "Population type", type: "d" },
    { code: "Staatsangehörigkeit (Kategorie)", text: "Citizenship (category)", type: "d" },
    { code: "Geschlecht", text: "Sex", type: "d" },
    { code: "Alter", text: "Age", type: "d" },
    { code: "Permanent and non permanent resident population", text: "Population", type: "c" },
  ],
  comments: [],
  data: [
    { key: ["2024", "8100", "1", "-99999", "-99999", "-99999"], values: ["9051029"] },
    { key: ["2024", "ZH", "1", "-99999", "-99999", "-99999"], values: ["1620020"] },
    { key: ["2024", "BE", "1", "-99999", "-99999", "-99999"], values: ["1071216"] },
    { key: ["2024", "LU", "1", "-99999", "-99999", "-99999"], values: ["437944"] },
    { key: ["2024", "UR", "1", "-99999", "-99999", "-99999"], values: ["38275"] },
    { key: ["2024", "SZ", "1", "-99999", "-99999", "-99999"], values: ["168931"] },
    { key: ["2024", "OW", "1", "-99999", "-99999", "-99999"], values: ["39662"] },
    { key: ["2024", "NW", "1", "-99999", "-99999", "-99999"], values: ["45345"] },
    { key: ["2024", "GL", "1", "-99999", "-99999", "-99999"], values: ["42371"] },
    { key: ["2024", "ZG", "1", "-99999", "-99999", "-99999"], values: ["133739"] },
    { key: ["2024", "FR", "1", "-99999", "-99999", "-99999"], values: ["341481"] },
    { key: ["2024", "SO", "1", "-99999", "-99999", "-99999"], values: ["281105"] },
    { key: ["2024", "BS", "1", "-99999", "-99999", "-99999"], values: ["183879"] },
    { key: ["2024", "BL", "1", "-99999", "-99999", "-99999"], values: ["297459"] },
    { key: ["2024", "SH", "1", "-99999", "-99999", "-99999"], values: ["86001"] },
    { key: ["2024", "AR", "1", "-99999", "-99999", "-99999"], values: ["56567"] },
    { key: ["2024", "AI", "1", "-99999", "-99999", "-99999"], values: ["17026"] },
    { key: ["2024", "SG", "1", "-99999", "-99999", "-99999"], values: ["524668"] },
    { key: ["2024", "GR", "1", "-99999", "-99999", "-99999"], values: ["202977"] },
    { key: ["2024", "AG", "1", "-99999", "-99999", "-99999"], values: ["720706"] },
    { key: ["2024", "TG", "1", "-99999", "-99999", "-99999"], values: ["295547"] },
    { key: ["2024", "TI", "1", "-99999", "-99999", "-99999"], values: ["360658"] },
    { key: ["2024", "VD", "1", "-99999", "-99999", "-99999"], values: ["855620"] },
    { key: ["2024", "VS", "1", "-99999", "-99999", "-99999"], values: ["360780"] },
    { key: ["2024", "NE", "1", "-99999", "-99999", "-99999"], values: ["177842"] },
    { key: ["2024", "GE", "1", "-99999", "-99999", "-99999"], values: ["519950"] },
    { key: ["2024", "JU", "1", "-99999", "-99999", "-99999"], values: ["73977"] },
  ],
  metadata: [],
};

// ── CKAN: Search results ─────────────────────────────────────────────────────

export const mockCkanSearchResults = {
  success: true,
  result: {
    count: 42,
    results: [
      {
        id: "a1b2c3",
        name: "bevolkerungsstatistik-einwohner",
        title: { en: "Population Statistics: Inhabitants", de: "Bevölkerungsstatistik: Einwohner" },
        notes: {
          en: "Since 1990, the residential buildings recorded in federal national censuses have been given coordinates.",
          de: "Seit 1990 werden die im Rahmen der eidgenössischen Volkszählungen erfassten bewohnten Gebäude koordiniert.",
        },
        keywords: {
          en: ["population", "statistics", "inhabitants"],
          de: ["bevölkerung", "statistik"],
        },
        metadata_modified: "2026-03-01T10:00:00",
        resources: [],
        contact_points: [{ name: "BFS Info", email: "info@bfs.admin.ch" }],
      },
      {
        id: "d4e5f6",
        name: "bevoelkerungsdichte-schweiz",
        title: { en: "Population Density Switzerland", de: "Bevölkerungsdichte Schweiz" },
        notes: { en: "Population density per km² by commune.", de: "Bevölkerungsdichte je km² nach Gemeinde." },
        keywords: { en: ["population density", "commune"], de: ["bevölkerungsdichte"] },
        metadata_modified: "2025-12-15T08:00:00",
        resources: [],
        contact_points: [],
      },
    ],
  },
};

// ── CKAN: Single dataset detail ──────────────────────────────────────────────

export const mockCkanDatasetDetail = {
  success: true,
  result: {
    id: "a1b2c3-uuid",
    name: "bevolkerungsstatistik-einwohner",
    title: { en: "Population Statistics: Inhabitants", de: "Bevölkerungsstatistik: Einwohner" },
    notes: {
      en: "Since 1990, the residential buildings recorded in federal national censuses have been given coordinates. Annual data available by commune.",
    },
    keywords: {
      en: ["population", "statistics", "inhabitants", "commune"],
      de: ["bevölkerung", "statistik"],
    },
    issued: "2020-01-01T00:00:00+00:00",
    metadata_modified: "2026-03-01T10:00:00",
    organization: {
      title: {
        en: "Federal Statistical Office FSO",
        de: "Bundesamt für Statistik BFS",
      },
    },
    contact_points: [{ name: "info@bfs.admin.ch", email: "auskunftsdienst@bfs.admin.ch" }],
    resources: [
      {
        name: { en: "Data (CSV)", de: "Daten (CSV)" },
        format: "CSV",
        url: "https://www.bfs.admin.ch/bfsstatic/dam/assets/example.csv",
      },
      {
        name: { en: "Map Preview", de: "Kartenvorschau" },
        format: "SERVICE",
        url: "https://map.geo.admin.ch/?layers=ch.bfs.volkszaehlung",
      },
    ],
  },
};

// ── CKAN: Dataset detail with sparse optional fields ─────────────────────────

export const mockCkanDatasetDetailSparse = {
  success: true,
  result: {
    id: "sparse-uuid",
    name: "sparse-dataset",
    title: { de: "Spärlicher Datensatz" }, // no EN title
    // use 'description' instead of 'notes' → hits the || pkg.description branch
    notes: null,
    description: { de: "Beschreibung über description-Feld." },
    // keywords completely absent → hits ?? [] final fallback
    // no 'issued' field → hits issued?.slice ?? "" fallback
    // no 'metadata_modified' → hits modified?.slice ?? "" fallback
    // no 'organization' → org = ""
    // no 'contact_points' → contact = undefined
    // no 'resources' → hits pkg.resources ?? [] fallback
  },
};

// ── Error responses ──────────────────────────────────────────────────────────

export const mockCkanNotFound = {
  success: false,
  error: { message: "Not found", __type: "Not Found Error" },
};

// ── CKAN: Search results with long description (for truncate branch) ──────────

// ── CKAN: Search results with sparse fields (no metadata_modified, no en keywords) ──

export const mockCkanSearchResultsSparse = {
  success: true,
  result: {
    count: 2,
    results: [
      {
        id: "sparse1",
        name: "sparse-search-dataset",
        title: { de: "Datensatz ohne Metadaten" }, // no EN title
        notes: null, // falsy notes → use description
        description: { de: "Kurze Beschreibung über description-Feld." },
        keywords: { de: ["test"] }, // no 'en' keywords → de fallback
        // no metadata_modified → hits ?? "" fallback
        resources: [],
        contact_points: [],
      },
      {
        id: "sparse2",
        name: "no-keywords-dataset",
        title: { en: "No Keywords Dataset" },
        notes: { en: "A dataset with no keywords at all." },
        // keywords completely absent → hits ?? [] final fallback
        metadata_modified: "2025-01-01T00:00:00",
        resources: [],
        contact_points: [],
      },
    ],
  },
};

const LONG_DESCRIPTION = "This is a very long description that exceeds 200 characters. " +
  "It covers topics such as Swiss demographics, cantonal statistics, migration flows, " +
  "age distribution, household composition, and economic indicators across all 26 cantons. " +
  "Additional metadata about data sources and methodologies is included here.";

export const mockCkanSearchResultsLongDesc = {
  success: true,
  result: {
    count: 1,
    results: [
      {
        id: "long1",
        name: "long-description-dataset",
        title: { en: "Long Description Dataset", de: "Datensatz mit langer Beschreibung" },
        notes: { en: LONG_DESCRIPTION, de: LONG_DESCRIPTION },
        keywords: { en: ["statistics"], de: ["statistik"] },
        metadata_modified: "2026-01-01T00:00:00",
        resources: [],
        contact_points: [],
      },
    ],
  },
};
