export const mockSearchResponse = {
  success: true,
  result: {
    count: 2,
    results: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "weather-station-klosters",
        title: { en: "Weather Station Klosters", de: "", fr: "", it: "" },
        notes: { en: "A weather station measured meteorological parameters at Klosters.", de: "" },
        keywords: { en: ["weather", "klosters", "temperature"], de: [] },
        metadata_modified: "2026-10-31T02:45:58.319099",
        num_resources: 1,
        organization: {
          name: "envidat",
          title: { en: "EnviDat: the Environmental Data Portal", de: "EnviDat" },
        },
      },
      {
        name: "population-statistics",
        title: { de: "Bevölkerungsstatistik", en: "", fr: "", it: "" },
        description: { de: "Einwohnerzahlen der Schweiz." },
        keywords: { de: ["bevölkerung"] },
        metadata_modified: "2025-01-02T00:00:00",
        resources: [{}, {}],
        organization: { name: "bundesamt-fur-statistik-bfs", title: "BFS" },
      },
    ],
  },
};

export const mockEmptySearch = {
  success: true,
  result: { count: 0, results: [] },
};

export const mockFailedSearch = {
  success: false,
  result: null,
};

export const mockPackage = {
  success: true,
  result: {
    id: "ab1b5ab1-40a3-41d8-8bf6-8c0bb7729b4e",
    name: "weather-station-klosters",
    title: { en: "Weather Station Klosters", de: "", fr: "", it: "" },
    notes: {
      en: "A weather station (Lufft WS600) measured meteorological parameters at Klosters.",
    },
    keywords: { en: ["weather", "wind", "temperature"], de: [] },
    issued: "2019-01-01T00:00:00",
    metadata_modified: "2026-10-31T02:45:58.319099",
    organization: {
      name: "envidat",
      title: { en: "EnviDat: the Environmental Data Portal" },
    },
    resources: [
      {
        name: { en: "", de: "", fr: "", it: "" },
        display_name: { en: "Klosters measurements", de: "" },
        description: { en: "MAT file of the station record." },
        format: "MAT",
        media_type: "application/octet-stream",
        url: "https://example.ch/raclets_weather_klosters.mat",
        download_url: "https://example.ch/raclets_weather_klosters.mat",
        byte_size: 2048,
      },
      {
        name: { de: "Vorschau", en: "" },
        format: "CSV",
        url: "https://example.ch/preview.csv",
        byte_size: 0,
      },
      {
        name: { en: "Map service" },
        format: "WMS",
        url: "https://wms.geo.admin.ch/?SERVICE=WMS",
      },
    ],
  },
};

export const mockPackageNoResources = {
  success: true,
  result: {
    name: "empty-dataset",
    title: "Empty dataset",
    organization: { name: "example-org" },
    resources: [],
  },
};

export const mockNotFound = {
  success: false,
  error: { message: "Not found" },
};
