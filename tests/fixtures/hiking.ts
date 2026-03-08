/**
 * Test fixtures for the Swiss Hiking Trail Closures module
 */

// ── Raw API response shapes ───────────────────────────────────────────────────

export const mockClosureResult = {
  layerBodId: "ch.astra.wanderland-sperrungen_umleitungen",
  layerName: "Sperrungen Wanderwege",
  featureId: 1769428,
  id: 1769428,
  attributes: {
    sperrungen_type: "closed_way",
    sperrungen_type_de: "Sperrung",
    sperrungen_type_fr: "Fermeture",
    sperrungen_type_it: "Chiusura",
    sperrungen_type_en: "Closure",
    land: "wanderland",
    duration_de: "Bis auf Weiteres",
    duration_fr: "Jusqu'à nouvel ordre",
    duration_it: "Fino a nuovo avviso",
    duration_en: "Until further notice",
    reason_de: "Steinschlag",
    reason_fr: "Chute de pierres",
    reason_it: "Caduta di pietre",
    reason_en: "Stone chipping",
    title_de: "Vazerol/Brienz - Propissi I",
    title_fr: "Vazerol/Brienz - Propissi I",
    title_it: "Vazerol/Brienz - Propissi I",
    title_en: "Vazerol/Brienz - Propissi I",
    abstract_en:
      "The hiking trail in the rockfall area above Brienz remains closed for safety reasons until further notice.",
    abstract_de:
      "Der Wanderweg im Steinschlaggebiet oberhalb von Brienz bleibt aus Sicherheitsgründen bis auf Weiteres gesperrt.",
    state_validate_en: "validated",
    file_de: null,
    file_fr: null,
    file_it: null,
    file_en: null,
    content_provider_en: "Swiss Hiking Federation and Cantonal Hiking Associations",
    url1_link_en: null,
    route_nr: null,
    segment_nr: null,
    label: "closed_way",
  },
};

export const mockDetourResult = {
  layerBodId: "ch.astra.wanderland-sperrungen_umleitungen",
  layerName: "Sperrungen Wanderwege",
  featureId: 1769429,
  id: 1769429,
  attributes: {
    sperrungen_type: "detour",
    sperrungen_type_de: "Sperrung und Umleitung",
    sperrungen_type_fr: "Fermeture et déviation",
    sperrungen_type_it: "Chiusura e deviazione",
    sperrungen_type_en: "Closure and diversion",
    land: "wanderland",
    duration_de: "01.01.2026 – 01.07.2026",
    duration_fr: "01.01.2026 – 01.07.2026",
    duration_it: "01.01.2026 – 01.07.2026",
    duration_en: "01.01.2026 – 01.07.2026",
    reason_de: "Bau- & Unterhaltsarbeiten",
    reason_fr: "Travaux de construction et d'entretien",
    reason_it: "Costruzione e manutenzione",
    reason_en: "Construction & maintenance work",
    title_de: "Brienzwiler - Meiringen",
    title_fr: "Brienzwiler - Meiringen",
    title_it: "Brienzwiler - Meiringen",
    title_en: "Brienzwiler - Meiringen",
    abstract_en:
      "Due to the complete reconstruction of the railroad line between Brienzwiler and Meiringen, the hiking trails in this area have to be closed and rerouted.",
    abstract_de:
      "Infolge Totalumbau der Bahnstrecke zwischen Brienzwiler und Meiringen müssen die Wanderwege in diesem Bereich gesperrt und umgeleitet werden.",
    state_validate_en: "validated",
    file_de: null,
    file_fr: null,
    file_it: null,
    file_en: null,
    content_provider_en: "Swiss Hiking Federation and Cantonal Hiking Associations",
    url1_link_en: null,
    route_nr: null,
    segment_nr: null,
    label: "closed_way",
  },
};

// ── Mocked API responses ─────────────────────────────────────────────────────

export const mockFindResponse = {
  results: [mockClosureResult, mockDetourResult],
};

export const mockFindResponseSingle = {
  results: [mockClosureResult],
};

export const mockFindResponseEmpty = {
  results: [],
};

export const mockFindResponseDetourOnly = {
  results: [mockDetourResult],
};

// ── Expected slim output shapes ───────────────────────────────────────────────

export const expectedSlimClosure = {
  id: 1769428,
  title: "Vazerol/Brienz - Propissi I",
  reason: "Stone chipping",
  duration: "Until further notice",
  type: "Closure",
  type_raw: "closed_way",
  description:
    "The hiking trail in the rockfall area above Brienz remains closed for safety reasons until further notice.",
};

export const expectedSlimDetour = {
  id: 1769429,
  title: "Brienzwiler - Meiringen",
  reason: "Construction & maintenance work",
  duration: "01.01.2026 – 01.07.2026",
  type: "Closure and diversion",
  type_raw: "detour",
  description:
    "Due to the complete reconstruction of the railroad line between Brienzwiler and Meiringen, the hiking trails in this area have to be closed and rerouted.",
};

// ── LV95 conversion test values ──────────────────────────────────────────────

// Bern: lat=46.948, lon=7.4474 → computed from wgs84ToLv95 formula
export const BERN_LAT = 46.948;
export const BERN_LON = 7.4474;
export const BERN_LV95_E_APPROX = 2600667;
export const BERN_LV95_N_APPROX = 1199657;

// Zurich: lat=47.3769, lon=8.5417 → computed from wgs84ToLv95 formula
export const ZURICH_LAT = 47.3769;
export const ZURICH_LON = 8.5417;
export const ZURICH_LV95_E_APPROX = 2683304;
export const ZURICH_LV95_N_APPROX = 1247926;
