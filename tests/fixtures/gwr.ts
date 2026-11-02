/**
 * Mock geo.admin.ch responses for the GWR module tests.
 * Shapes mirror the live `ch.bfs.gebaeude_wohnungs_register` layer (trimmed).
 */

const baseNoDwellings = {
  ewid: null,
  whgnr: null,
  wstwk: null,
  wmehrg: null,
  wbez: null,
  wstat: null,
  wbauj: null,
  warea: null,
  wazim: null,
  wkche: null,
};

// Hôtel de Ville de Lausanne — non-residential, no dwellings, single entrance
export const townHallAttrs = {
  egid: "2119257",
  edid: "0",
  label: "Place de la Palud 2",
  strname_deinr: "Place de la Palud 2",
  dplz4: 1003,
  dplzname: "Lausanne",
  ggdename: "Lausanne",
  ggdenr: 5586,
  gdekt: "VD",
  egrid: "CH907857723624",
  lparz: "10071",
  gebnr: "5466",
  gbez: "Hôtel Seigneux (Hôtel de Ville)",
  gkode: 2538173.654,
  gkodn: 1152588.099,
  gstat: 1004,
  gkat: 1060,
  gklas: 1220,
  gbauj: 1700,
  gbaum: null,
  gbaup: 8011,
  gabbj: null,
  garea: 1095,
  gvol: null,
  gastw: 5,
  ganzwhg: null,
  gazzi: null,
  gebf: null,
  gwaerzh1: 7460,
  genh1: 7580,
  gwaerdath1: "29.11.2001",
  gwaerzh2: null,
  genh2: null,
  gwaerdath2: "-",
  gwaerzw1: 7650,
  genw1: 7560,
  gwaerdatw1: "29.11.2001",
  gwaerzw2: 7600,
  genw2: 7500,
  gwaerdatw2: "29.11.2001",
  gexpdat: "17.09.2026",
  ...baseNoDwellings,
};

// Place de la Palud 20 — residential, 3 dwellings (trimmed from 5)
export const paludTwentyAttrs = {
  ...townHallAttrs,
  egid: "882682",
  label: "Place de la Palud 20",
  strname_deinr: "Place de la Palud 20",
  gbez: "",
  gkat: 1030,
  gklas: 1122,
  gbauj: 1820,
  garea: 170,
  gastw: 6,
  ganzwhg: 3,
  gwaerzh1: 7430,
  genh1: 7520,
  gwaerzh2: 7400,
  genh2: 7500,
  gwaerdath2: "04.06.2018",
  gwaerzw1: 7630,
  genw1: 7520,
  gwaerzw2: null,
  genw2: null,
  ewid: ["1", "2", "3"],
  whgnr: ["201", "301", ""],
  wstwk: [3102, 3100, 3401],
  wmehrg: [0, 1, null],
  wbez: ["gauche", null, "droite"],
  wstat: [3004, 3004, 3099],
  wbauj: [1999, 1999, null],
  warea: [18, 28, null],
  wazim: [1, 2, null],
  wkche: [1, 0, null],
};

// Multi-entrance building: dwellings split across entrances 0 and 1, entrance 2 has none
const multiBase = {
  ...townHallAttrs,
  egid: "882657",
  gbez: "",
  gkat: 1030,
  gklas: 1122,
  gbauj: 1918,
  gbaup: 9999, // unknown code on purpose
  ganzwhg: 3,
  gwaerzh1: null,
  genh1: null,
  gwaerzw1: null,
  genw1: null,
  gwaerzw2: null,
  genw2: null,
  gexpdat: null,
};

export const multiEntranceFind = {
  results: [
    {
      featureId: "882657_2",
      geometry: { x: 6.631805, y: 46.522374, spatialReference: { wkid: 4326 } },
      attributes: { ...multiBase, edid: "2", label: "Rue Saint-Laurent 8", strname_deinr: "Rue Saint-Laurent 8", ...baseNoDwellings },
    },
    {
      featureId: "882657_1",
      geometry: { x: 6.632012, y: 46.522459, spatialReference: { wkid: 4326 } },
      attributes: {
        ...multiBase,
        edid: "1",
        label: "Rue Saint-Laurent 6",
        strname_deinr: "Rue Saint-Laurent 6",
        ewid: ["3"],
        whgnr: ["301"],
        wstwk: [3150],
        wmehrg: [0],
        wbez: [null],
        wstat: [3004],
        wbauj: [1999],
        warea: [70],
        wazim: [3],
        wkche: [1],
      },
    },
    {
      featureId: "882657_0",
      geometry: { x: 6.631986, y: 46.522588, spatialReference: { wkid: 4326 } },
      attributes: {
        ...multiBase,
        edid: "0",
        label: "Place Marc-Louis-Arlaud 1",
        strname_deinr: "Place Marc-Louis-Arlaud 1",
        ewid: ["2", "1"],
        whgnr: ["205", "101"],
        wstwk: [3102, 3101],
        wmehrg: [0, 0],
        wbez: [null, null],
        wstat: [3004, 3004],
        wbauj: [1999, 1999],
        warea: [63, 79],
        wazim: [2, 3],
        wkche: [1, 1],
      },
    },
    // A "contains" false-positive must be ignored (different EGID)
    {
      featureId: "1882657_0",
      geometry: { x: 7.1, y: 46.8 },
      attributes: { ...multiBase, egid: "1882657", edid: "0" },
    },
  ],
};

export const townHallFind = {
  results: [
    {
      featureId: "2119257_0",
      geometry: { x: 6.632926, y: 46.521793, spatialReference: { wkid: 4326 } },
      attributes: townHallAttrs,
    },
  ],
};

export const emptyFind = { results: [] };

// ── SearchServer featuresearch ─────────────────────────────────────────────

export const featureSearch = {
  results: [
    {
      attrs: {
        featureId: "2119257_0",
        label: "Place de la Palud 2 1003 Lausanne",
        lat: 46.521793365478516,
        lon: 6.632925987243652,
        layer: "ch.bfs.gebaeude_wohnungs_register",
        origin: "feature",
      },
    },
    {
      attrs: {
        featureId: "882682_0",
        label: "Place de la Palud 20 1003 Lausanne",
        lat: 46.521942138671875,
        lon: 6.633116245269775,
        layer: "ch.bfs.gebaeude_wohnungs_register",
        origin: "feature",
      },
    },
    {
      // Not returned by the batch feature call → falls back to search data
      attrs: {
        featureId: "882683_0",
        label: "Place de la Palud <b>21</b> 1003 Lausanne",
        layer: "ch.bfs.gebaeude_wohnungs_register",
      },
    },
    {
      // Other layer — ignored
      attrs: { featureId: "x_0", label: "Other", layer: "ch.other.layer" },
    },
  ],
};

export const emptySearch = { results: [] };

export const batchFeatures = {
  type: "FeatureCollection",
  features: [
    { featureId: "2119257_0", attributes: townHallAttrs },
    { featureId: "882682_0", attributes: paludTwentyAttrs },
  ],
};

// ── identify ───────────────────────────────────────────────────────────────

export const identifyNear = {
  results: [
    // 882682 entrance ~22 m away
    { featureId: "882682_0", geometry: { x: 6.633116, y: 46.521941 }, attributes: paludTwentyAttrs },
    // town hall at the centre
    { featureId: "2119257_0", geometry: { x: 6.632926, y: 46.521793 }, attributes: townHallAttrs },
    // second (farther) entrance of the same building 882682 — deduplicated
    { featureId: "882682_1", geometry: { x: 6.6334, y: 46.5221 }, attributes: { ...paludTwentyAttrs, edid: "1" } },
    // inside the envelope corner but outside the circle (~70 m)
    { featureId: "999_0", geometry: { x: 6.63356, y: 46.52224 }, attributes: { ...townHallAttrs, egid: "999" } },
    // no geometry — skipped
    { featureId: "998_0", geometry: null, attributes: { ...townHallAttrs, egid: "998" } },
  ],
};
