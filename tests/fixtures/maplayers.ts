export const mockCatalog = {
  layers: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
      name: "Municipal boundaries",
      fullName: "Municipal boundaries of Switzerland",
      idGeoCat: "abc-123",
      attributes: {
        dataOwner: "swisstopo",
        abstract: "Political municipalities, including historical versions.",
        scaleLimit: "1:1",
      },
    },
    {
      layerBodId: "ch.bafu.gewaesserschutz-grundwasserschutzzonen",
      name: "Groundwater protection zones",
      fullName: "Groundwater protection zones",
      attributes: {
        dataOwner: "BAFU",
        abstract: "Groundwater protection zones and areas.",
      },
    },
    {
      layerBodId: "ch.swisstopo.pixelkarte-farbe",
      name: "National map",
      attributes: { dataOwner: "swisstopo", abstract: "Swiss national map colour." },
    },
  ],
};

export const mockIdentify = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
      layerName: "Municipal boundaries",
      featureId: "16401-1850",
      attributes: {
        gemname: "Bern",
        jahr: 1850,
        kanton: "BE",
        is_current_jahr: false,
        link_de: "https://example.invalid/de/" + "x".repeat(40),
      },
    },
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
      layerName: "Municipal boundaries",
      featureId: "351-2026",
      attributes: {
        gemname: "Bern",
        jahr: 2026,
        kanton: "BE",
        gde_nr: 351,
        is_current_jahr: true,
        link_en: "https://example.invalid/long",
        note: "y".repeat(400),
      },
    },
  ],
};

export const mockFind = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
      layerName: "Gemeindegrenzen",
      featureId: "1",
      attributes: { gemname: "Bern", jahr: 2026, is_current_jahr: true, kanton: "BE" },
    },
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
      layerName: "Gemeindegrenzen",
      featureId: "2",
      attributes: { gemname: "Bern", jahr: 1900, is_current_jahr: false, kanton: "BE" },
    },
  ],
};

export const mockEmptyFeatures = { results: [] };
