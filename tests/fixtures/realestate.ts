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

export interface CpiRow {
  jahr: string;
  monat: string;
  index: string;
}

const CPI_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/**
 * Stand-in for the Canton Zug CPI store: Dec 1982, then 2020–2024 in full and
 * 2025 up to October, the way the real store trails the current month.
 */
export const cpiStoreRows: CpiRow[] = [
  { jahr: "1982", monat: "Dezember", index: "100" },
  ...[2020, 2021, 2022, 2023, 2024].flatMap((year) =>
    CPI_MONTHS.map((monat, i) => ({
      jahr: String(year),
      monat,
      index: (160 + (year - 2020) * 2 + i * 0.1).toFixed(1),
    }))
  ),
  ...CPI_MONTHS.slice(0, 10).map((monat, i) => ({
    jahr: "2025",
    monat,
    index: (170 + i * 0.1).toFixed(1),
  })),
];

// ── IMPI (BFS residential property price index) ──────────────────────────────

/** dam-api asset listing for orderNr=ds-x-05.06.03.01.02 */
export const mockImpiAssetList = {
  total: 1,
  skip: 0,
  data: [
    {
      ids: { uuid: "0cf9c0e4", damId: 36753640, contentId: 26085129, gnp: "2026-0320" },
      bfs: { lifecycle: { code: "CURRENT", name: "Diffundiert" } },
      links: [
        { href: "https://dam-api.bfs.admin.ch/hub/api/dam/assets/36753640", rel: "self" },
        {
          href: "https://dam-api.bfs.admin.ch/hub/api/dam/assets/36753640/master",
          rel: "master",
          format: "json",
        },
      ],
    },
  ],
};

/** Same listing but with no downloadable data file. */
export const mockImpiAssetListNoMaster = {
  total: 1,
  skip: 0,
  data: [
    {
      ids: { damId: 24986296 },
      bfs: { lifecycle: { code: "REDUNDANT" } },
      links: [{ href: "https://dam-api.bfs.admin.ch/hub/api/dam/assets/24986296", rel: "self" }],
    },
  ],
};

/**
 * First 16 quarters of the published IMPI series (2017-Q1 … 2020-Q4), verbatim
 * from the BFS chart data file. Quarters are labelled by their middle month.
 */
export const mockImpiData = {
  dataStatus: "30.07.2026",
  data: {
    total: {
      geoscope1: [
        { year: "02.2017", value: 90.4561 },
        { year: "05.2017", value: 91.6814 },
        { year: "08.2017", value: 93.4534 },
        { year: "11.2017", value: 93.2599 },
        { year: "02.2018", value: 93.1957 },
        { year: "05.2018", value: 94.6749 },
        { year: "08.2018", value: 95.2729 },
        { year: "11.2018", value: 96.6715 },
        { year: "02.2019", value: 97.6275 },
        { year: "05.2019", value: 98.1359 },
        { year: "08.2019", value: 98.2721 },
        { year: "11.2019", value: 100 },
        { year: "02.2020", value: 99.2443 },
        { year: "05.2020", value: 100.5969 },
        { year: "08.2020", value: 100.8153 },
        { year: "11.2020", value: 103.1292 },
      ],
      geoscope2: [],
    },
    efh: {
      geoscope1: [
        { year: "02.2017", value: 89.7446 },
        { year: "05.2017", value: 91.4114 },
        { year: "08.2017", value: 93.4627 },
        { year: "11.2017", value: 92.3657 },
        { year: "02.2018", value: 92.3773 },
        { year: "05.2018", value: 94.1561 },
        { year: "08.2018", value: 95.1912 },
        { year: "11.2018", value: 96.594 },
        { year: "02.2019", value: 97.0706 },
        { year: "05.2019", value: 98.2087 },
        { year: "08.2019", value: 98.5735 },
        { year: "11.2019", value: 100 },
        { year: "02.2020", value: 99.4514 },
        { year: "05.2020", value: 100.5419 },
        { year: "08.2020", value: 101.6683 },
        { year: "11.2020", value: 103.154 },
      ],
    },
    egw: {
      geoscope1: [
        { year: "02.2017", value: 91.1885 },
        { year: "05.2017", value: 91.9562 },
        { year: "08.2017", value: 93.4385 },
        { year: "11.2017", value: 94.1815 },
        { year: "02.2018", value: 94.0386 },
        { year: "05.2018", value: 95.2072 },
        { year: "08.2018", value: 95.3523 },
        { year: "11.2018", value: 96.7464 },
        { year: "02.2019", value: 98.1662 },
        { year: "05.2019", value: 98.0654 },
        { year: "08.2019", value: 97.9807 },
        { year: "11.2019", value: 100 },
        { year: "02.2020", value: 99.052 },
        { year: "05.2020", value: 100.648 },
        { year: "08.2020", value: 100.0234 },
        { year: "11.2020", value: 103.1062 },
      ],
    },
  },
};

/** House and apartment series of different lengths — must be rejected. */
export const mockImpiDataTruncated = {
  dataStatus: "30.07.2026",
  data: {
    total: { geoscope1: mockImpiData.data.total.geoscope1 },
    efh: { geoscope1: mockImpiData.data.efh.geoscope1.slice(0, 3) },
    egw: { geoscope1: mockImpiData.data.egw.geoscope1 },
  },
};
