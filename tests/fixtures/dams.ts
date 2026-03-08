// ── Fixtures for Swiss Dams & Reservoirs module tests ───────────────────────

/** Single dam find result — Grande Dixence (world's tallest gravity dam) */
const grandeDixenceDam = {
  featureId: 130676916,
  id: 130676916,
  layerBodId: "ch.bfe.stauanlagen-bundesaufsicht",
  layerName: "Stauanlagen",
  bbox: [597249.3, 103229.9, 597249.3, 103229.9] as [number, number, number, number],
  geometry: { x: 597249.3, y: 103229.9, spatialReference: { wkid: 21781 } },
  attributes: {
    damname: "Grande Dixence",
    damtype_de: "Gewichtsmauer",
    damtype_en: "gravity dam",
    damtype_fr: "barrage poids",
    damheight: 285.0,
    crestlevel: 2365.0,
    crestlength: 695.0,
    facilityname: "Grande Dixence",
    reservoirname: "Grande Dixence",
    impoundmentvolume: "385.000",
    impoundmentlevel: 2364.0,
    storagelevel: 284.0,
    facaim_de: "Hydroelektrizität",
    facaim_en: "hydroelectricity",
    facaim_fr: "hydroélectricité",
    beginningofoperation: "1961-01-01",
    startsupervision: "1972-07-10",
    baujahr: 1961,
    has_picture: 200,
    facility_stabil_id: 130676149,
    label: "Grande Dixence",
  },
};

/** Spitallamm dam — part of Grimsel facility */
const spitalammDam = {
  featureId: 130676894,
  id: 130676894,
  layerBodId: "ch.bfe.stauanlagen-bundesaufsicht",
  layerName: "Stauanlagen",
  bbox: [668300.3, 158269.7, 668300.3, 158269.7] as [number, number, number, number],
  geometry: { x: 668300.3, y: 158269.7, spatialReference: { wkid: 21781 } },
  attributes: {
    damname: "Spitallamm",
    damtype_de: "Bogengewichtsmauer",
    damtype_en: "arch-gravity dam",
    damtype_fr: "barrage poids-voûte",
    damheight: 114.0,
    crestlevel: 1911.24,
    crestlength: 258.0,
    facilityname: "Grimsel",
    reservoirname: "Grimsel",
    impoundmentvolume: "100.490",
    impoundmentlevel: 1908.74,
    storagelevel: 107.74,
    facaim_de: "Hydroelektrizität",
    facaim_en: "hydroelectricity",
    facaim_fr: "hydroélectricité",
    beginningofoperation: "1932-01-01",
    startsupervision: "1954-01-01",
    baujahr: 1932,
    has_picture: 200,
    facility_stabil_id: 130676092,
    label: "Spitallamm",
  },
};

/** Seeuferegg dam — part of Grimsel facility */
const seeufereggDam = {
  featureId: 130676893,
  id: 130676893,
  layerBodId: "ch.bfe.stauanlagen-bundesaufsicht",
  layerName: "Stauanlagen",
  bbox: [668950.3, 158389.7, 668950.3, 158389.7] as [number, number, number, number],
  geometry: { x: 668950.3, y: 158389.7, spatialReference: { wkid: 21781 } },
  attributes: {
    damname: "Seeuferegg",
    damtype_de: "Gewichtsmauer",
    damtype_en: "gravity dam",
    damtype_fr: "barrage poids",
    damheight: 42.0,
    crestlevel: 1911.84,
    crestlength: 336.0,
    facilityname: "Grimsel",
    reservoirname: "Grimsel",
    impoundmentvolume: "100.490",
    impoundmentlevel: 1908.74,
    storagelevel: 107.74,
    facaim_de: "Hydroelektrizität",
    facaim_en: "hydroelectricity",
    facaim_fr: "hydroélectricité",
    beginningofoperation: "1932-01-01",
    startsupervision: "1954-01-01",
    baujahr: 1932,
    has_picture: 200,
    facility_stabil_id: 130676092,
    label: "Seeuferegg",
  },
};

/** Mattmark dam — in Valais */
const mattmarkDam = {
  featureId: 130676918,
  id: 130676918,
  layerBodId: "ch.bfe.stauanlagen-bundesaufsicht",
  layerName: "Stauanlagen",
  bbox: [641000.0, 99000.0, 641000.0, 99000.0] as [number, number, number, number],
  geometry: { x: 641000.0, y: 99000.0, spatialReference: { wkid: 21781 } },
  attributes: {
    damname: "Mattmark",
    damtype_de: "Damm",
    damtype_en: "embankment dam",
    damtype_fr: "barrage en remblai",
    damheight: 120.0,
    crestlevel: 2212.0,
    crestlength: 820.0,
    facilityname: "Mattmark",
    reservoirname: "Mattmarksee",
    impoundmentvolume: "100.000",
    impoundmentlevel: 2206.0,
    storagelevel: 100.0,
    facaim_de: "Hydroelektrizität",
    facaim_en: "hydroelectricity",
    facaim_fr: "hydroélectricité",
    beginningofoperation: "1967-01-01",
    startsupervision: "1972-07-10",
    baujahr: 1967,
    has_picture: 200,
    facility_stabil_id: 130676150,
    label: "Mattmark",
  },
};

/** Dam without geometry (edge case) */
const damNoGeometry = {
  featureId: 999999,
  id: 999999,
  layerBodId: "ch.bfe.stauanlagen-bundesaufsicht",
  layerName: "Stauanlagen",
  bbox: [600000, 100000, 600000, 100000] as [number, number, number, number],
  attributes: {
    damname: "TestDamNoGeo",
    damtype_de: "Gewichtsmauer",
    damtype_en: "gravity dam",
    damtype_fr: "barrage poids",
    damheight: 50.0,
    crestlevel: 1500.0,
    crestlength: 200.0,
    facilityname: "TestFacility",
    reservoirname: "TestReservoir",
    impoundmentvolume: "10.000",
    impoundmentlevel: 1498.0,
    storagelevel: 50.0,
    facaim_de: "Hydroelektrizität",
    facaim_en: "hydroelectricity",
    facaim_fr: "hydroélectricité",
    beginningofoperation: "1950-01-01",
    startsupervision: "1960-01-01",
    baujahr: 1950,
    has_picture: 404,
    facility_stabil_id: 999000,
    label: "TestDamNoGeo",
  },
};

// ── Named response fixtures ──────────────────────────────────────────────────

/** find?searchField=damname&searchText=Grande+Dixence → single result */
export const mockDamSearchByName = {
  results: [grandeDixenceDam],
};

/** find?searchField=reservoirname&searchText=Grimsel → two results */
export const mockDamSearchByReservoir = {
  results: [spitalammDam, seeufereggDam],
};

/** find?searchField=damname&searchText=Grimsel → multiple results */
export const mockDamSearchGrimsel = {
  results: [spitalammDam, seeufereggDam],
};

/** Empty results response */
export const mockDamSearchEmpty = {
  results: [] as typeof grandeDixenceDam[],
};

/** Canton identify response for VS (Valais) */
export const mockCantonIdentifyVS = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      featureId: 23,
      id: 23,
      attributes: {
        ak: "VS",
        name: "Valais",
        flaeche: 522464.0,
        label: "Valais",
      },
    },
  ],
};

/** Canton identify response for BE (Bern) */
export const mockCantonIdentifyBE = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      featureId: 2,
      id: 2,
      attributes: {
        ak: "BE",
        name: "Bern",
        flaeche: 594827.0,
        label: "Bern",
      },
    },
  ],
};

/** Canton find (no geometry) for VS */
export const mockCantonFindVS = {
  results: [
    {
      featureId: 23,
      id: 23,
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      attributes: {
        ak: "VS",
        name: "Valais",
        flaeche: 522464.0,
        label: "Valais",
      },
    },
  ],
};

/** Canton find (with geometry/bbox) for VS */
export const mockCantonFindWithBboxVS = {
  results: [
    {
      featureId: 23,
      id: 23,
      bbox: [548579.4, 78560.2, 679786.8, 167428.4] as [number, number, number, number],
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      attributes: {
        ak: "VS",
        name: "Valais",
        flaeche: 522464.0,
        label: "Valais",
      },
    },
  ],
};

/** Canton find — empty (unknown canton) */
export const mockCantonFindEmpty = {
  results: [] as typeof mockCantonFindVS["results"],
};

/** All dams (used for by-canton filtering) — VS coordinates */
export const mockAllDamsWithGeometry = {
  results: [grandeDixenceDam, mattmarkDam, spitalammDam],
};

/** All dams with no geometry results */
export const mockAllDamsNoGeometry = {
  results: [damNoGeometry],
};

// Export individual dam objects for direct assertions
export { grandeDixenceDam, spitalammDam, seeufereggDam, mattmarkDam, damNoGeometry };
