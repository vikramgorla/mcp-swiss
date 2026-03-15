import { describe, it, expect, vi, afterEach } from "vitest";
import { handleSnow, snowTools } from "../../src/modules/snow.js";
import {
  mockImisStations,
  mockStudyPlotStations,
  mockDailySnow,
  mockDailySnowWithNulls,
  mockImisMeasurements,
  mockStudyPlotMeasurements,
  mockEmptyArray,
} from "../fixtures/snow.js";

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchJSON(...responses: unknown[]) {
  let callIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const data = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve(data),
      });
    })
  );
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tool definitions ──────────────────────────────────────────────────────────

describe("snowTools", () => {
  it("exports 3 tools", () => {
    expect(snowTools).toHaveLength(3);
  });

  it("tool names are correct", () => {
    const names = snowTools.map((t) => t.name);
    expect(names).toContain("get_snow_conditions");
    expect(names).toContain("list_snow_stations");
    expect(names).toContain("get_snow_measurements");
  });

  it("get_snow_measurements requires station_code", () => {
    const tool = snowTools.find((t) => t.name === "get_snow_measurements")!;
    expect(tool.inputSchema.required).toContain("station_code");
  });

  it("get_snow_conditions has no required fields", () => {
    const tool = snowTools.find((t) => t.name === "get_snow_conditions")!;
    expect(tool.inputSchema.required ?? []).toHaveLength(0);
  });

  it("list_snow_stations has no required fields", () => {
    const tool = snowTools.find((t) => t.name === "list_snow_stations")!;
    expect(tool.inputSchema.required ?? []).toHaveLength(0);
  });
});

// ── get_snow_conditions ───────────────────────────────────────────────────────

describe("get_snow_conditions", () => {
  it("returns stations sorted by snow depth descending", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    expect(result.count).toBe(5);
    expect(result.stations[0].code).toBe("ZER4"); // 245 cm
    expect(result.stations[1].code).toBe("WFJ2"); // 198 cm
    expect(result.stations[2].code).toBe("AND2"); // 170 cm
  });

  it("each station has expected fields", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    const s = result.stations[0];
    expect(s.station).toBe("Zermatt");
    expect(typeof s.altitude_m).toBe("number");
    expect(typeof s.canton).toBe("string");
    expect(typeof s.snow_depth_cm).toBe("number");
    expect(typeof s.new_snow_24h_cm).toBe("number");
    expect(s.date).toBe("2026-03-15");
  });

  it("filters by canton", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { canton: "GR" })
    );
    expect(result.count).toBe(2); // DAV2 + WFJ2
    expect(result.filters.canton).toBe("GR");
    for (const s of result.stations) {
      expect(s.canton).toBe("GR");
    }
  });

  it("filters by min_altitude", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { min_altitude: 2500 })
    );
    // ZER4 (3150), DAV2 (2558), WFJ2 (2536) — all >= 2500
    expect(result.count).toBe(3);
    expect(result.filters.min_altitude_m).toBe(2500);
    for (const s of result.stations) {
      expect(s.altitude_m).toBeGreaterThanOrEqual(2500);
    }
  });

  it("combines canton and min_altitude filters", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { canton: "GR", min_altitude: 2550 })
    );
    expect(result.count).toBe(1); // Only DAV2 (2558, GR)
    expect(result.stations[0].code).toBe("DAV2");
  });

  it("respects limit parameter", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { limit: 2 })
    );
    expect(result.count).toBe(2);
  });

  it("caps limit at 100", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { limit: 999 })
    );
    // All 5 returned (< 100)
    expect(result.count).toBe(5);
  });

  it("handles null HS/HN_1D values", async () => {
    mockFetchJSON(mockDailySnowWithNulls, mockImisStations);
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    expect(result.count).toBe(2);
    // Station with null HS sorts after station with 198
    expect(result.stations[0].snow_depth_cm).toBe(198.0);
    expect(result.stations[1].snow_depth_cm).toBeNull();
  });

  it("handles empty snow data", async () => {
    mockFetchJSON(mockEmptyArray, mockImisStations);
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    expect(result.count).toBe(0);
    expect(result.stations).toHaveLength(0);
  });

  it("skips stations not found in station map", async () => {
    const snowWithUnknown = [
      ...mockDailySnow,
      { station_code: "UNKNOWN", measure_date: "2026-03-15T00:00:00", HS: 500, HN_1D: 50 },
    ];
    mockFetchJSON(snowWithUnknown, mockImisStations);
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    // UNKNOWN station should be filtered out
    expect(result.count).toBe(5);
  });

  it("canton filter is case-insensitive", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { canton: "gr" })
    );
    expect(result.count).toBe(2);
  });

  it("contains source attribution", async () => {
    mockFetchJSON(mockDailySnow, mockImisStations);
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    expect(result.source).toContain("SLF");
  });

  it("throws on HTTP error", async () => {
    mockFetchError(500);
    await expect(handleSnow("get_snow_conditions", {})).rejects.toThrow(
      "HTTP 500"
    );
  });
});

// ── list_snow_stations ────────────────────────────────────────────────────────

describe("list_snow_stations", () => {
  it("returns combined IMIS and study-plot stations", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(await handleSnow("list_snow_stations", {}));
    expect(result.total_stations).toBe(8); // 5 + 3
    expect(result.count).toBeLessThanOrEqual(20);
  });

  it("stations are sorted by elevation descending", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(await handleSnow("list_snow_stations", { limit: 100 }));
    const altitudes = result.stations.map((s: { altitude_m: number }) => s.altitude_m);
    for (let i = 1; i < altitudes.length; i++) {
      expect(altitudes[i]).toBeLessThanOrEqual(altitudes[i - 1]);
    }
  });

  it("each station has expected fields", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(await handleSnow("list_snow_stations", { limit: 100 }));
    for (const s of result.stations) {
      expect(typeof s.code).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.altitude_m).toBe("number");
      expect(typeof s.canton).toBe("string");
      expect(["imis", "study-plot"]).toContain(s.type);
    }
  });

  it("filters by type=imis", async () => {
    mockFetchJSON(mockImisStations, mockEmptyArray);
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { type: "imis", limit: 100 })
    );
    expect(result.type).toBe("imis");
    for (const s of result.stations) {
      expect(s.type).toBe("imis");
    }
  });

  it("filters by type=study-plot", async () => {
    mockFetchJSON(mockEmptyArray, mockStudyPlotStations);
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { type: "study-plot", limit: 100 })
    );
    expect(result.type).toBe("study-plot");
    for (const s of result.stations) {
      expect(s.type).toBe("study-plot");
    }
  });

  it("filters by canton", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { canton: "VS", limit: 100 })
    );
    expect(result.canton).toBe("VS");
    for (const s of result.stations) {
      expect(s.canton).toBe("VS");
    }
  });

  it("respects limit", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { limit: 3 })
    );
    expect(result.count).toBe(3);
    expect(result.stations).toHaveLength(3);
  });

  it("caps limit at 200", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { limit: 999 })
    );
    expect(result.count).toBe(8);
  });

  it("handles empty station lists", async () => {
    mockFetchJSON(mockEmptyArray, mockEmptyArray);
    const result = JSON.parse(await handleSnow("list_snow_stations", {}));
    expect(result.count).toBe(0);
    expect(result.total_stations).toBe(0);
  });

  it("contains source attribution", async () => {
    mockFetchJSON(mockImisStations, mockStudyPlotStations);
    const result = JSON.parse(await handleSnow("list_snow_stations", {}));
    expect(result.source).toContain("SLF");
  });

  it("throws on HTTP error", async () => {
    mockFetchError(503);
    await expect(handleSnow("list_snow_stations", {})).rejects.toThrow(
      "HTTP 503"
    );
  });
});

// ── get_snow_measurements ─────────────────────────────────────────────────────

describe("get_snow_measurements", () => {
  it("returns IMIS measurements by default", async () => {
    mockFetchJSON(mockImisMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    expect(result.station_code).toBe("DAV2");
    expect(result.type).toBe("imis");
    expect(result.measurement_count).toBe(3);
    expect(Array.isArray(result.measurements)).toBe(true);
  });

  it("IMIS measurements have readable field names", async () => {
    mockFetchJSON(mockImisMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    const m = result.measurements[0]; // most recent (reversed)
    expect(m.time).toBeDefined();
    expect(typeof m.snow_depth_cm).toBe("number");
    expect(typeof m.air_temp_c).toBe("number");
    expect(typeof m.humidity_pct).toBe("number");
    expect(typeof m.wind_speed_m_s).toBe("number");
  });

  it("measurements are returned most-recent-first", async () => {
    mockFetchJSON(mockImisMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    const times = result.measurements.map((m: { time: string }) => m.time);
    // First should be latest (08:30), last should be earliest (07:30)
    expect(times[0]).toBe("2026-03-15T08:30:00Z");
    expect(times[times.length - 1]).toBe("2026-03-15T07:30:00Z");
  });

  it("IMIS result includes field descriptions", async () => {
    mockFetchJSON(mockImisMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    expect(result.fields).toBeDefined();
    expect(result.fields.snow_depth_cm).toContain("snow depth");
  });

  it("returns study-plot measurements when type=study-plot", async () => {
    mockFetchJSON(mockStudyPlotMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", {
        station_code: "4AO0",
        type: "study-plot",
      })
    );
    expect(result.station_code).toBe("4AO0");
    expect(result.type).toBe("study-plot");
    expect(result.measurement_count).toBe(2);
  });

  it("study-plot measurements have correct fields", async () => {
    mockFetchJSON(mockStudyPlotMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", {
        station_code: "4AO0",
        type: "study-plot",
      })
    );
    const m = result.measurements[0];
    expect(m.time).toBeDefined();
    expect(typeof m.snow_depth_cm).toBe("number");
    expect(m).toHaveProperty("new_snow_24h_cm");
    expect(m).toHaveProperty("new_snow_water_equiv_mm");
  });

  it("throws when station_code is missing", async () => {
    await expect(handleSnow("get_snow_measurements", {})).rejects.toThrow(
      "station_code is required"
    );
  });

  it("throws when station_code is empty", async () => {
    await expect(
      handleSnow("get_snow_measurements", { station_code: "  " })
    ).rejects.toThrow("station_code is required");
  });

  it("handles empty measurement response", async () => {
    mockFetchJSON(mockEmptyArray);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    expect(result.measurement_count).toBe(0);
    expect(result.measurements).toHaveLength(0);
  });

  it("contains source attribution", async () => {
    mockFetchJSON(mockImisMeasurements);
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    expect(result.source).toContain("SLF");
  });

  it("throws on HTTP error", async () => {
    mockFetchError(404);
    await expect(
      handleSnow("get_snow_measurements", { station_code: "BADCODE" })
    ).rejects.toThrow("HTTP 404");
  });
});

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe("unknown snow tool", () => {
  it("throws for unrecognized tool name", async () => {
    await expect(handleSnow("does_not_exist", {})).rejects.toThrow(
      "Unknown snow tool: does_not_exist"
    );
  });
});
