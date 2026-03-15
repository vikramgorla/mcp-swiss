/**
 * Mock API responses for snow module tests.
 */

// ── IMIS stations ───────────────────────────────────────────────────────────

export const mockImisStations = [
  {
    code: "DAV2",
    label: "Bärentälli",
    lon: 9.8194,
    lat: 46.6989,
    elevation: 2558.0,
    country_code: "CH",
    canton_code: "GR",
    type: "SNOW_FLAT",
  },
  {
    code: "WFJ2",
    label: "Weissfluhjoch",
    lon: 9.8064,
    lat: 46.8297,
    elevation: 2536.0,
    country_code: "CH",
    canton_code: "GR",
    type: "SNOW_FLAT",
  },
  {
    code: "ZER4",
    label: "Zermatt",
    lon: 7.7498,
    lat: 46.0297,
    elevation: 3150.0,
    country_code: "CH",
    canton_code: "VS",
    type: "SNOW_FLAT",
  },
  {
    code: "ELM2",
    label: "Elm",
    lon: 9.1741,
    lat: 46.9171,
    elevation: 1480.0,
    country_code: "CH",
    canton_code: "GL",
    type: "SNOW_FLAT",
  },
  {
    code: "AND2",
    label: "Andermatt",
    lon: 8.5946,
    lat: 46.6381,
    elevation: 2106.0,
    country_code: "CH",
    canton_code: "UR",
    type: "SNOW_FLAT",
  },
];

// ── Study plot stations ─────────────────────────────────────────────────────

export const mockStudyPlotStations = [
  {
    code: "4AO0",
    label: "Arolla",
    lon: 7.4803,
    lat: 46.0281,
    elevation: 2070.0,
    country_code: "CH",
    canton_code: "VS",
  },
  {
    code: "1AD0",
    label: "Adelboden",
    lon: 7.5647,
    lat: 46.4932,
    elevation: 1350.0,
    country_code: "CH",
    canton_code: "BE",
  },
  {
    code: "2DA0",
    label: "Davos",
    lon: 9.8513,
    lat: 46.8130,
    elevation: 1560.0,
    country_code: "CH",
    canton_code: "GR",
  },
];

// ── Daily snow data ─────────────────────────────────────────────────────────

export const mockDailySnow = [
  {
    station_code: "ZER4",
    measure_date: "2026-03-15T00:00:00",
    HS: 245.0,
    HN_1D: 32.0,
  },
  {
    station_code: "DAV2",
    measure_date: "2026-03-15T00:00:00",
    HS: 139.0,
    HN_1D: 15.2,
  },
  {
    station_code: "WFJ2",
    measure_date: "2026-03-15T00:00:00",
    HS: 198.0,
    HN_1D: 22.5,
  },
  {
    station_code: "ELM2",
    measure_date: "2026-03-15T00:00:00",
    HS: 55.0,
    HN_1D: 5.0,
  },
  {
    station_code: "AND2",
    measure_date: "2026-03-15T00:00:00",
    HS: 170.0,
    HN_1D: 18.0,
  },
];

// Daily snow with null values
export const mockDailySnowWithNulls = [
  {
    station_code: "DAV2",
    measure_date: "2026-03-15T00:00:00",
    HS: null,
    HN_1D: null,
  },
  {
    station_code: "WFJ2",
    measure_date: "2026-03-15T00:00:00",
    HS: 198.0,
    HN_1D: null,
  },
];

// ── IMIS measurements (detailed 30-min data) ───────────────────────────────

export const mockImisMeasurements = [
  {
    station_code: "DAV2",
    measure_date: "2026-03-15T07:30:00Z",
    HS: 138.5,
    TA_30MIN_MEAN: -8.2,
    RH_30MIN_MEAN: 91.5,
    TSS_30MIN_MEAN: -12.3,
    TS0_30MIN_MEAN: 0.7,
    TS25_30MIN_MEAN: -0.4,
    TS50_30MIN_MEAN: -1.5,
    TS100_30MIN_MEAN: -3.1,
    RSWR_30MIN_MEAN: 120.0,
    VW_30MIN_MEAN: 2.5,
    VW_30MIN_MAX: 6.8,
    DW_30MIN_MEAN: 180.0,
    DW_30MIN_SD: 22.0,
  },
  {
    station_code: "DAV2",
    measure_date: "2026-03-15T08:00:00Z",
    HS: 139.0,
    TA_30MIN_MEAN: -7.5,
    RH_30MIN_MEAN: 89.2,
    TSS_30MIN_MEAN: -11.8,
    TS0_30MIN_MEAN: 0.7,
    TS25_30MIN_MEAN: -0.3,
    TS50_30MIN_MEAN: -1.4,
    TS100_30MIN_MEAN: -3.0,
    RSWR_30MIN_MEAN: 250.0,
    VW_30MIN_MEAN: 3.1,
    VW_30MIN_MAX: 8.2,
    DW_30MIN_MEAN: 175.0,
    DW_30MIN_SD: 18.0,
  },
  {
    station_code: "DAV2",
    measure_date: "2026-03-15T08:30:00Z",
    HS: 139.2,
    TA_30MIN_MEAN: -6.8,
    RH_30MIN_MEAN: 87.0,
    TSS_30MIN_MEAN: -11.0,
    TS0_30MIN_MEAN: 0.7,
    TS25_30MIN_MEAN: -0.3,
    TS50_30MIN_MEAN: -1.4,
    TS100_30MIN_MEAN: -2.9,
    RSWR_30MIN_MEAN: 400.0,
    VW_30MIN_MEAN: 1.8,
    VW_30MIN_MAX: 4.5,
    DW_30MIN_MEAN: 165.0,
    DW_30MIN_SD: 15.0,
  },
];

// ── Study plot measurements ─────────────────────────────────────────────────

export const mockStudyPlotMeasurements = [
  {
    station_code: "4AO0",
    measure_date: "2026-03-15T06:00:00Z",
    HS: 79.0,
    HN_1D: 21.0,
    HNW_1D: null,
  },
  {
    station_code: "4AO0",
    measure_date: "2026-03-14T06:00:00Z",
    HS: 65.0,
    HN_1D: 8.0,
    HNW_1D: 5.2,
  },
];

// Empty responses
export const mockEmptyArray: unknown[] = [];
