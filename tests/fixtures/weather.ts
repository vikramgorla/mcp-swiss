export const mockWeatherResponse = {
  source: "SwissMetNet, Federal Office of Meteorology and Climatology MeteoSwiss",
  apiurl: "https://api.existenz.ch#smn",
  opendata: "https://opendatadocs.meteoswiss.ch",
  license: "https://opendatadocs.meteoswiss.ch/general/terms-of-use",
  payload: [
    { timestamp: 1741360200, loc: "BER", par: "tt", val: 11.2 },
    { timestamp: 1741360200, loc: "BER", par: "rr", val: 0 },
    { timestamp: 1741360200, loc: "BER", par: "ss", val: 0 },
    { timestamp: 1741360200, loc: "BER", par: "rh", val: 72 },
    { timestamp: 1741360200, loc: "BER", par: "ff", val: 2.1 },
    { timestamp: 1741360200, loc: "BER", par: "fu", val: 5.4 },
    { timestamp: 1741360200, loc: "BER", par: "p0", val: 942.3 },
  ],
};

export const mockHydroResponse = {
  source: "Swiss Federal Office for the Environment FOEN / BAFU, Hydrology",
  apiurl: "https://api.existenz.ch#hydro",
  opendata: "https://opendata.swiss/en/dataset/wassertemperatur-der-flusse",
  license: "https://www.bafu.admin.ch/dam/bafu/",
  payload: [
    { timestamp: 1741360200, loc: "2135", par: "height", val: 501.51 },
    { timestamp: 1741360200, loc: "2135", par: "flow", val: 40.99 },
    { timestamp: 1741360200, loc: "2135", par: "temperature", val: 9.18 },
  ],
};

export const mockWeatherStations = {
  source: "SwissMetNet",
  apiurl: "https://api.existenz.ch#smn",
  opendata: "https://opendatadocs.meteoswiss.ch",
  license: "https://opendatadocs.meteoswiss.ch/general/terms-of-use",
  payload: {
    BER: {
      id: 1,
      name: "BER",
      details: { name: "Bern / Zollikofen", canton: "BE", lat: 46.991, lon: 7.463 },
    },
    SMA: {
      id: 2,
      name: "SMA",
      details: { name: "Zürich / Fluntern", canton: "ZH", lat: 47.378, lon: 8.566 },
    },
    LUG: {
      id: 3,
      name: "LUG",
      details: { name: "Lugano", canton: "TI", lat: 46.004, lon: 8.96 },
    },
  },
};

export const mockWeatherHistoryResponse = {
  source: "SwissMetNet",
  apiurl: "https://api.existenz.ch#smn",
  payload: [
    { timestamp: 1741273800, loc: "BER", par: "tt", val: 8.5 },
    { timestamp: 1741273800, loc: "BER", par: "rh", val: 80 },
    { timestamp: 1741360200, loc: "BER", par: "tt", val: 11.2 },
    { timestamp: 1741360200, loc: "BER", par: "rh", val: 72 },
  ],
};

export const mockHydroHistoryResponse = {
  source: "Swiss Federal Office for the Environment FOEN / BAFU, Hydrology",
  apiurl: "https://api.existenz.ch#hydro",
  payload: [
    { timestamp: 1741273800, loc: "2135", par: "height", val: 500.1 },
    { timestamp: 1741273800, loc: "2135", par: "flow", val: 38.5 },
    { timestamp: 1741360200, loc: "2135", par: "height", val: 501.51 },
    { timestamp: 1741360200, loc: "2135", par: "flow", val: 40.99 },
  ],
};

export const mockHydroStations = {
  source: "Swiss Federal Office for the Environment FOEN / BAFU, Hydrology",
  apiurl: "https://api.existenz.ch#hydro",
  payload: {
    "2135": {
      id: 1,
      name: "2135",
      details: { id: "2135", name: "Aare - Bern, Schönau", "water-body-name": "Aare", "water-body-type": "river", lat: 46.943, lon: 7.441 },
    },
    "2243": {
      id: 2,
      name: "2243",
      details: { id: "2243", name: "Rhein - Basel, Rheinhalle", "water-body-name": "Rhein", "water-body-type": "river", lat: 47.567, lon: 7.597 },
    },
  },
};
