// Test fixtures for NABEL air quality module

export const mockNabelStationResponse = {
  feature: {
    featureId: "BER",
    id: "BER",
    layerBodId: "ch.bafu.nabelstationen",
    layerName: "Messstationen Luftqualität",
    bbox: [7.440866, 46.950993, 7.440866, 46.950993],
    geometry: {
      x: 7.440866,
      y: 46.950993,
      spatialReference: { wkid: 4326 },
    },
    attributes: {
      name: "Bern-Bollwerk",
      url_de: "https://www.bafu.admin.ch/bafu/de/home/themen/luft/zustand/daten/datenabfrage-nabel.html",
      url_fr: "https://www.bafu.admin.ch/bafu/de/home/themen/luft/zustand/daten/datenabfrage-nabel.html",
      url_it: "https://www.bafu.admin.ch/bafu/de/home/themen/luft/zustand/daten/datenabfrage-nabel.html",
      url_en: "https://www.bafu.admin.ch/bafu/de/home/themen/luft/zustand/daten/datenabfrage-nabel.html",
      label: "Bern-Bollwerk",
    },
  },
};

export const mockNabelStationLugano = {
  feature: {
    featureId: "LUG",
    id: "LUG",
    layerBodId: "ch.bafu.nabelstationen",
    layerName: "Messstationen Luftqualität",
    bbox: [8.957165, 46.011117, 8.957165, 46.011117],
    geometry: {
      x: 8.957165,
      y: 46.011117,
      spatialReference: { wkid: 4326 },
    },
    attributes: {
      name: "Lugano",
      url_en: "https://www.bafu.admin.ch/bafu/de/home/themen/luft/zustand/daten/datenabfrage-nabel.html",
      label: "Lugano",
    },
  },
};

export const EXPECTED_STATION_CODES = [
  "BAS", "BER", "CHA", "DAV", "DUE",
  "HAE", "LAU", "LUG", "MAG", "PAY",
  "RIG", "SIO", "TAE", "ZUE",
];

export const EXPECTED_SWISS_LIMITS = {
  PM10:  { annual_mean_µg_m3: 20,  daily_mean_µg_m3: 50 },
  PM2_5: { annual_mean_µg_m3: 10 },
  O3:    { hourly_mean_µg_m3: 120 },
  NO2:   { annual_mean_µg_m3: 30, hourly_mean_µg_m3: 100 },
  SO2:   { annual_mean_µg_m3: 30 },
};
