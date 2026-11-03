import { describe, it, expect, vi, afterEach } from "vitest";
import { handlePollen, pollenTools, clearPollenCache } from "../../src/modules/pollen.js";
import {
  mockStationsCSV,
  mockHourlyCSV,
  mockHourlyCSVWithEmpty,
  mockDailyCSV,
  mockDailyCSVAllEmpty,
  mockEmptyCSV,
  mockStationsMultiCantonCSV,
} from "../fixtures/pollen.js";

// ── Fetch mock helpers ────────────────────────────────────────────────────────

/** MeteoSwiss serves these files as ISO-8859-1 bytes under a bare text/csv. */
function csvResponse(csvBody: string) {
  const bytes = Buffer.from(csvBody, "latin1");
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    arrayBuffer: () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  };
}

/**
 * The measurement tools check the station against the live station list first,
 * so the metadata CSV has to be served alongside the payload under test.
 */
function mockFetchCSV(csvBody: string) {
  const isStationList = csvBody.startsWith("station_abbr;station_name");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        csvResponse(
          url.includes("meta_stations") && !isStationList ? mockStationsCSV : csvBody,
        ),
      ),
    ),
  );
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: "Internal Server Error",
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearPollenCache();
});

// ── Tool definitions ──────────────────────────────────────────────────────────

describe("pollenTools", () => {
  it("exports 3 tools", () => {
    expect(pollenTools).toHaveLength(3);
  });

  it("tool names are correct", () => {
    const names = pollenTools.map((t) => t.name);
    expect(names).toContain("get_pollen_current");
    expect(names).toContain("get_pollen_daily");
    expect(names).toContain("list_pollen_stations");
  });

  it("get_pollen_current requires station", () => {
    const tool = pollenTools.find((t) => t.name === "get_pollen_current")!;
    expect(tool.inputSchema.required).toContain("station");
  });

  it("get_pollen_daily requires station", () => {
    const tool = pollenTools.find((t) => t.name === "get_pollen_daily")!;
    expect(tool.inputSchema.required).toContain("station");
  });

  it("list_pollen_stations has no required fields", () => {
    const tool = pollenTools.find((t) => t.name === "list_pollen_stations")!;
    expect(tool.inputSchema.required ?? []).toHaveLength(0);
  });
});

// ── get_pollen_current ────────────────────────────────────────────────────────

describe("get_pollen_current", () => {
  it("returns current pollen levels for a station", async () => {
    mockFetchCSV(mockHourlyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    expect(result.station).toBe("PZH");
    expect(result.source).toBe("MeteoSwiss");
    expect(result.latest_timestamp).toBe("27.03.2026 23:00");
    expect(result.current_levels).toBeDefined();
    expect(result.current_levels.Birch).toBe(32);
    expect(result.current_levels.Ash).toBe(5);
  });

  it("returns 6 recent hours of readings", async () => {
    mockFetchCSV(mockHourlyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    expect(result.recent_hours).toHaveLength(6);
  });

  it("each reading has all 7 pollen types", async () => {
    mockFetchCSV(mockHourlyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    const types = result.recent_hours[0].pollen.map(
      (p: { type: string }) => p.type,
    );
    expect(types).toContain("Birch");
    expect(types).toContain("Grasses");
    expect(types).toContain("Alder");
    expect(types).toContain("Hazel");
    expect(types).toContain("Beech");
    expect(types).toContain("Ash");
    expect(types).toContain("Oak");
  });

  it("handles empty/missing values as null", async () => {
    mockFetchCSV(mockHourlyCSVWithEmpty);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PBE" }),
    );
    const latest = result.recent_hours[result.recent_hours.length - 1];
    const birch = latest.pollen.find(
      (p: { type: string }) => p.type === "Birch",
    );
    expect(birch.concentration).toBe(15);
    const grasses = latest.pollen.find(
      (p: { type: string }) => p.type === "Grasses",
    );
    expect(grasses.concentration).toBeNull();
  });

  it("station code is case-insensitive", async () => {
    mockFetchCSV(mockHourlyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "pzh" }),
    );
    expect(result.station).toBe("PZH");
  });

  it("throws for missing station param", async () => {
    await expect(
      handlePollen("get_pollen_current", {}),
    ).rejects.toThrow("station is required");
  });

  it("throws for empty station param", async () => {
    await expect(
      handlePollen("get_pollen_current", { station: "  " }),
    ).rejects.toThrow("station is required");
  });

  it("throws for unknown station code", async () => {
    mockFetchCSV(mockHourlyCSV);
    await expect(
      handlePollen("get_pollen_current", { station: "XXX" }),
    ).rejects.toThrow('Unknown pollen station "XXX"');
  });

  // The allow-list used to be frozen in the module and drifted from the network
  it("accepts a station the live list carries but the schema enum does not", async () => {
    const withNewStation = [
      mockStationsCSV,
      "PXX;Testhausen;ZH;;;;;;MeteoSchweiz;01.01.2026;400.0;;;;47.0;8.0;;;;;;;;",
    ].join("\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          csvResponse(url.includes("meta_stations") ? withNewStation : mockHourlyCSV),
        ),
      ),
    );

    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PXX" }),
    );
    expect(result.station).toBe("PXX");
  });

  it("rejects a station the live list no longer carries", async () => {
    mockFetchCSV(mockHourlyCSV);
    // PJU (Jura) was retired; it used to sit in the hard-coded allow-list
    await expect(
      handlePollen("get_pollen_current", { station: "PJU" }),
    ).rejects.toThrow('Unknown pollen station "PJU"');
  });

  it("handles empty CSV (header only)", async () => {
    mockFetchCSV(mockEmptyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    expect(result.message).toBe("No hourly pollen data available");
    expect(result.source).toBe("MeteoSwiss");
  });

  it("throws on HTTP error", async () => {
    mockFetchError(500);
    await expect(
      handlePollen("get_pollen_current", { station: "PZH" }),
    ).rejects.toThrow("HTTP 500");
  });

  it("includes pollen_types list", async () => {
    mockFetchCSV(mockHourlyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    expect(result.pollen_types).toContain("Birch");
    expect(result.pollen_types).toContain("Grasses");
    expect(result.pollen_types).toHaveLength(7);
  });

  it("includes unit information", async () => {
    mockFetchCSV(mockHourlyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    expect(result.unit).toBe("pollen/m³");
  });
});

// ── get_pollen_daily ──────────────────────────────────────────────────────────

describe("get_pollen_daily", () => {
  it("returns daily pollen data with defaults (7 days)", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE" }),
    );
    expect(result.station).toBe("PBE");
    expect(result.source).toBe("MeteoSwiss");
    expect(result.days).toBe(7);
    expect(result.daily).toHaveLength(7);
  });

  it("returns fewer days when requested", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE", days: 3 }),
    );
    expect(result.days).toBe(3);
    expect(result.daily).toHaveLength(3);
  });

  it("dates are in ISO format", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE", days: 1 }),
    );
    expect(result.daily[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("each day has 7 pollen types", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE", days: 1 }),
    );
    expect(result.daily[0].pollen).toHaveLength(7);
    const types = result.daily[0].pollen.map(
      (p: { type: string }) => p.type,
    );
    expect(types).toContain("Birch");
    expect(types).toContain("Ash");
  });

  it("handles empty d0 values as null", async () => {
    mockFetchCSV(mockDailyCSVAllEmpty);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PDS", days: 1 }),
    );
    const day = result.daily[0];
    for (const p of day.pollen) {
      expect(p.concentration).toBeNull();
    }
  });

  it("caps days at 90", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE", days: 200 }),
    );
    // Only 7 rows in fixture, so returns all 7
    expect(result.days).toBe(7);
  });

  it("minimum days is 1", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE", days: 0 }),
    );
    expect(result.days).toBe(1);
  });

  it("includes period description", async () => {
    mockFetchCSV(mockDailyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE" }),
    );
    expect(result.period).toContain("d0");
  });

  it("throws for missing station", async () => {
    await expect(
      handlePollen("get_pollen_daily", {}),
    ).rejects.toThrow("station is required");
  });

  it("throws for unknown station", async () => {
    // The station check reads the live list, so this needs the mock like any
    // other call — without it the test reaches MeteoSwiss for real.
    mockFetchCSV(mockDailyCSV);
    await expect(
      handlePollen("get_pollen_daily", { station: "YYY" }),
    ).rejects.toThrow('Unknown pollen station "YYY"');
  });

  it("throws on HTTP error", async () => {
    mockFetchError(404);
    await expect(
      handlePollen("get_pollen_daily", { station: "PBE" }),
    ).rejects.toThrow("HTTP 404");
  });

  it("handles empty CSV (header only)", async () => {
    mockFetchCSV(mockEmptyCSV);
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE" }),
    );
    expect(result.days).toBe(0);
    expect(result.message).toBe("No daily pollen data available");
  });
});

// ── list_pollen_stations ──────────────────────────────────────────────────────

describe("list_pollen_stations", () => {
  it("returns all stations", async () => {
    mockFetchCSV(mockStationsCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    expect(result.count).toBe(6);
    expect(result.stations).toHaveLength(6);
    expect(result.source).toBe("MeteoSwiss");
  });

  it("stations have expected fields", async () => {
    mockFetchCSV(mockStationsCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    const station = result.stations[0];
    expect(station.code).toBe("PBE");
    expect(station.name).toBe("Bern");
    expect(station.canton).toBe("BE");
    expect(typeof station.altitude_m).toBe("number");
    expect(station.coordinates).toBeDefined();
    expect(typeof station.coordinates.lat).toBe("number");
    expect(typeof station.coordinates.lon).toBe("number");
  });

  it("decodes accented station names", async () => {
    mockFetchCSV(mockStationsCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    const byCode = Object.fromEntries(
      result.stations.map((s: { code: string; name: string }) => [s.code, s.name]),
    );
    expect(byCode.PZH).toBe("Zürich");
    expect(byCode.PGE).toBe("Genève");
  });

  it("filters by canton", async () => {
    mockFetchCSV(mockStationsMultiCantonCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", { canton: "TI" }),
    );
    expect(result.count).toBe(2);
    for (const s of result.stations) {
      expect(s.canton).toBe("TI");
    }
  });

  it("canton filter is case-insensitive", async () => {
    mockFetchCSV(mockStationsMultiCantonCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", { canton: "ti" }),
    );
    expect(result.count).toBe(2);
  });

  it("canton filter with no matches returns empty", async () => {
    mockFetchCSV(mockStationsMultiCantonCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", { canton: "ZG" }),
    );
    expect(result.count).toBe(0);
    expect(result.stations).toHaveLength(0);
  });

  it("includes pollen_types list", async () => {
    mockFetchCSV(mockStationsCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    expect(result.pollen_types).toContain("Birch");
    expect(result.pollen_types).toContain("Grasses");
    expect(result.pollen_types).toHaveLength(7);
  });

  it("includes network description", async () => {
    mockFetchCSV(mockStationsCSV);
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    expect(result.network).toContain("MeteoSwiss");
  });

  it("throws on HTTP error", async () => {
    mockFetchError(503);
    await expect(
      handlePollen("list_pollen_stations", {}),
    ).rejects.toThrow("HTTP 503");
  });
});

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe("unknown pollen tool", () => {
  it("throws for unrecognized tool name", async () => {
    await expect(
      handlePollen("does_not_exist", {}),
    ).rejects.toThrow("Unknown pollen tool: does_not_exist");
  });
});
