// ── Fixtures for Swiss Post (PLZ) module tests ───────────────────────────────

/** Response from MapServer/find for PLZ 8001 */
export const mockPlzFindResponse = {
  results: [
    {
      featureId: "4385",
      id: "4385",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8001,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8001,
        bgdi_created: "01.03.2026",
      },
    },
  ],
};

/** Response from SearchServer (origins=zipcode) for PLZ 8001 */
export const mockSearchZipcodeResponse = {
  results: [
    {
      id: 4385,
      weight: 100,
      attrs: {
        detail: "8001",
        featureId: "4385",
        geom_quadindex: "030003",
        geom_st_box2d: "BOX(8.528869 47.363094,8.553853 47.383059)",
        label: "<b>8001 - Zürich</b>",
        lat: 47.372947692871094,
        lon: 8.541608810424805,
        num: 1,
        objectclass: "",
        origin: "zipcode",
        rank: 1,
        x: 8.541608810424805,
        y: 47.372947692871094,
        zoomlevel: 4294967295,
      },
    },
  ],
};

/** Response from MapServer/identify for canton at Zürich coords */
export const mockCantonIdentifyResponse = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      featureId: 1,
      id: 1,
      attributes: {
        ak: "ZH",
        name: "Zürich",
        flaeche: 172894.0,
        label: "Zürich",
      },
    },
  ],
};

/** Response from MapServer/find for langtext=Zürich */
export const mockSearchByNameResponse = {
  results: [
    {
      featureId: "4385",
      id: "4385",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8001,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8001,
      },
    },
    {
      featureId: "4386",
      id: "4386",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8002,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8002,
      },
    },
    {
      featureId: "4387",
      id: "4387",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8003,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8003,
      },
    },
  ],
};

/** Response from MapServer/find for canton ZH */
export const mockCantonFindResponse = {
  results: [
    {
      featureId: "1",
      id: "1",
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      bbox: [8.351853, 47.162404, 8.995778, 47.690268],
      attributes: {
        ak: "ZH",
        name: "Zürich",
        flaeche: 172894.0,
        label: "Zürich",
      },
    },
  ],
};

/** Response from MapServer/identify (envelope) for PLZ in ZH */
export const mockPlzInCantonResponse = {
  results: [
    {
      featureId: "4385",
      id: "4385",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8001,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8001,
      },
    },
    {
      featureId: "4386",
      id: "4386",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8002,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8002,
      },
    },
    {
      featureId: "4450",
      id: "4450",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8400,
        zusziff: "00",
        langtext: "Winterthur",
        status: "REAL",
        modified: "26.01.2021",
        label: 8400,
      },
    },
  ],
};

/** Empty results fixture */
export const mockEmptyResults = {
  results: [],
};
