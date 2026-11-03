// Test fixtures for NABEL air quality module

export const EXPECTED_STATION_CODES = [
  "BAS", "BER", "BRM", "CHA", "DAV", "DUE", "HAE", "JUN",
  "LAU", "LUG", "MAG", "PAY", "RIG", "SIO", "TAE", "ZUE",
];

/** MapServer/identify over the whole layer, as list_air_quality_stations asks for it. */
export const mockNabelIdentifyResponse = {
  results: [
    ...EXPECTED_STATION_CODES.map((code, i) => ({
      featureId: code,
      id: code,
      layerBodId: "ch.bafu.nabelstationen",
      geometry: { x: 7 + i / 100, y: 46 + i / 100, spatialReference: { wkid: 4326 } },
      attributes: { name: `Station ${code}` },
    })),
  ],
};

/** The same layer, having gained a station the hard-coded table does not know. */
export const mockNabelIdentifyWithNewStation = {
  results: [
    ...mockNabelIdentifyResponse.results,
    {
      featureId: "XYZ",
      id: "XYZ",
      layerBodId: "ch.bafu.nabelstationen",
      geometry: { x: 8.5, y: 47.1, spatialReference: { wkid: 4326 } },
      attributes: { name: "Neue Station" },
    },
  ],
};

export const EXPECTED_SWISS_LIMITS = {
  PM10:  { annual_mean_µg_m3: 20,  daily_mean_µg_m3: 50 },
  PM2_5: { annual_mean_µg_m3: 10 },
  O3:    { hourly_mean_µg_m3: 120 },
  NO2:   { annual_mean_µg_m3: 30, hourly_mean_µg_m3: 100 },
  SO2:   { annual_mean_µg_m3: 30 },
};
