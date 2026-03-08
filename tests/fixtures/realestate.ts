// Mock data for real estate module tests

// ── CKAN search results ──────────────────────────────────────────────────────

export const mockCkanSearchResults = {
  success: true,
  result: {
    count: 2,
    results: [
      {
        id: "abc-123",
        name: "schweizerischer-wohnimmobilienpreisindex-4q-2019-100",
        title: {
          de: "Schweizerischer Wohnimmobilienpreisindex (4Q 2019 = 100)",
          en: "Swiss residential property price index (Q4 2019 = 100)",
          fr: "",
          it: "",
        },
        notes: {
          de: "Vierteljährlicher Preisindex für Wohnimmobilien in der Schweiz",
          en: "Quarterly price index for residential property in Switzerland",
          fr: "",
          it: "",
        },
        keywords: {
          de: ["Immobilien", "Preisindex", "Wohnimmobilien"],
          en: ["real estate", "price index", "residential property"],
        },
        metadata_modified: "2024-06-01T00:00:00.000Z",
        organization: {
          title: {
            de: "Bundesamt für Statistik (BFS)",
            en: "Federal Statistical Office (FSO)",
          },
        },
        resources: [
          {
            name: { de: "PDF Dokument DE", en: "", fr: "", it: "" },
            format: "PDF",
            url: "https://dam-api.bfs.admin.ch/hub/api/dam/assets/14716379/master",
          },
          {
            name: { en: "Report EN", de: "", fr: "", it: "" },
            format: "HTML",
            url: "https://www.bfs.admin.ch/asset/en/2074-2001",
          },
        ],
      },
      {
        id: "def-456",
        name: "wohnungsmieten-kanton-zuerich",
        title: { de: "Wohnungsmieten Kanton Zürich", en: "", fr: "", it: "" },
        notes: {
          de: "Durchschnittliche Wohnungsmieten im Kanton Zürich nach Gemeinde",
          en: "",
          fr: "",
          it: "",
        },
        keywords: { de: ["Miete", "Wohnen", "Zürich"] },
        metadata_modified: "2023-12-01T00:00:00.000Z",
        organization: { title: { de: "Kanton Zürich", en: "" } },
        resources: [
          {
            name: { de: "CSV Daten", en: "" },
            format: "CSV",
            url: "https://example.com/data.csv",
          },
        ],
      },
    ],
  },
};

export const mockCkanSearchResultsEmpty = {
  success: true,
  result: {
    count: 0,
    results: [],
  },
};

export const mockCkanSearchResultsFallback = {
  success: true,
  result: {
    count: 1,
    results: [
      {
        id: "xyz-789",
        name: "some-fallback-dataset",
        title: { de: "Fallback Dataset", en: "Fallback Dataset" },
        notes: { de: "Beschreibung des Fallback-Datasets.", en: "" },
        keywords: { de: ["wohnen"] },
        metadata_modified: "2024-01-01T00:00:00.000Z",
        organization: { title: { de: "Test Org" } },
        resources: [],
      },
    ],
  },
};

export const mockCkanSearchFailed = {
  success: false,
  result: { count: 0, results: [] },
};

// ── CPI / Rent index data ────────────────────────────────────────────────────

export const mockCpiLatest = {
  resultCount: 515,
  offset: 491,
  limit: 24,
  results: [
    { jahr: "2023", monat: "Januar", index: "167.2" },
    { jahr: "2023", monat: "Februar", index: "167.5" },
    { jahr: "2023", monat: "März", index: "167.9" },
    { jahr: "2023", monat: "April", index: "168.1" },
    { jahr: "2023", monat: "Mai", index: "168.3" },
    { jahr: "2023", monat: "Juni", index: "168.4" },
    { jahr: "2023", monat: "Juli", index: "168.3" },
    { jahr: "2023", monat: "August", index: "168.3" },
    { jahr: "2023", monat: "September", index: "168.0" },
    { jahr: "2023", monat: "Oktober", index: "167.8" },
    { jahr: "2023", monat: "November", index: "167.7" },
    { jahr: "2023", monat: "Dezember", index: "167.6" },
    { jahr: "2024", monat: "Januar", index: "168.8" },
    { jahr: "2024", monat: "Februar", index: "169.5" },
    { jahr: "2024", monat: "März", index: "169.8" },
    { jahr: "2024", monat: "April", index: "169.9" },
    { jahr: "2024", monat: "Mai", index: "170.1" },
    { jahr: "2024", monat: "Juni", index: "170.4" },
    { jahr: "2024", monat: "Juli", index: "170.4" },
    { jahr: "2024", monat: "August", index: "170.2" },
    { jahr: "2024", monat: "September", index: "169.9" },
    { jahr: "2024", monat: "Oktober", index: "169.4" },
    { jahr: "2024", monat: "November", index: "169.2" },
    { jahr: "2024", monat: "Dezember", index: "169.0" },
  ],
};

export const mockCpiYear2020 = {
  resultCount: 515,
  offset: 445,
  limit: 12,
  results: [
    { jahr: "2020", monat: "Januar", index: "161.9" },
    { jahr: "2020", monat: "Februar", index: "162.0" },
    { jahr: "2020", monat: "März", index: "162.1" },
    { jahr: "2020", monat: "April", index: "161.8" },
    { jahr: "2020", monat: "Mai", index: "161.5" },
    { jahr: "2020", monat: "Juni", index: "161.8" },
    { jahr: "2020", monat: "Juli", index: "161.7" },
    { jahr: "2020", monat: "August", index: "161.8" },
    { jahr: "2020", monat: "September", index: "161.5" },
    { jahr: "2020", monat: "Oktober", index: "161.5" },
    { jahr: "2020", monat: "November", index: "161.4" },
    { jahr: "2020", monat: "Dezember", index: "161.5" },
    // adjacent year rows that will be filtered out
    { jahr: "2019", monat: "Dezember", index: "160.5" },
    { jahr: "2021", monat: "Januar", index: "162.5" },
  ],
};

export const mockCpiNoData = {
  resultCount: 515,
  offset: 0,
  limit: 12,
  results: [
    { jahr: "1982", monat: "Dezember", index: "100" },
    { jahr: "1983", monat: "Januar", index: "99.9" },
  ],
};

export const mockCpiSmall = {
  resultCount: 515,
  offset: 503,
  limit: 12,
  results: [
    { jahr: "2024", monat: "Januar", index: "168.8" },
    { jahr: "2024", monat: "Februar", index: "169.5" },
  ],
};
