import { describe, it, expect, vi, afterEach } from "vitest";
import { handleDams, damsTools } from "../../src/modules/dams.js";
import {
  mockDamSearchByName,
  mockDamSearchByReservoir,
  mockDamSearchGrimsel,
  mockDamSearchEmpty,
  mockCantonIdentifyVS,
  mockCantonIdentifyBE,
  mockCantonFindVS,
  mockCantonFindWithBboxVS,
  mockCantonFindEmpty,
  mockAllDamsWithGeometry,
  mockAllDamsNoGeometry,
  grandeDixenceDam,
} from "../fixtures/dams.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Queue multiple fetch responses in order.
 */
function mockFetchSequence(...payloads: unknown[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const payload = payloads[call] ?? { results: [] };
      call++;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve(payload),
      });
    })
  );
}

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(payload),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── damsTools export ──────────────────────────────────────────────────────────

describe("damsTools", () => {
  it("exports an array of 3 tools", () => {
    expect(Array.isArray(damsTools)).toBe(true);
    expect(damsTools).toHaveLength(3);
  });

  it("has all required tool names", () => {
    const names = damsTools.map((t) => t.name);
    expect(names).toContain("search_dams");
    expect(names).toContain("get_dams_by_canton");
    expect(names).toContain("get_dam_details");
  });

  it("all tools have inputSchema with type and required", () => {
    for (const tool of damsTools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
  });

  it("search_dams requires query param", () => {
    const tool = damsTools.find((t) => t.name === "search_dams")!;
    expect(tool.inputSchema.required).toContain("query");
    expect(tool.inputSchema.properties).toHaveProperty("query");
  });

  it("get_dams_by_canton requires canton param", () => {
    const tool = damsTools.find((t) => t.name === "get_dams_by_canton")!;
    expect(tool.inputSchema.required).toContain("canton");
    expect(tool.inputSchema.properties).toHaveProperty("canton");
  });

  it("get_dam_details requires name param", () => {
    const tool = damsTools.find((t) => t.name === "get_dam_details")!;
    expect(tool.inputSchema.required).toContain("name");
    expect(tool.inputSchema.properties).toHaveProperty("name");
  });
});

// ── search_dams ──────────────────────────────────────────────────────────────

describe("search_dams", () => {
  it("returns dam results with expected fields", async () => {
    // findDams(damname) returns result, then fetchCantonForCoords(identify)
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    expect(result.results).toHaveLength(1);
    const dam = result.results[0];
    expect(dam.dam_name).toBe("Grande Dixence");
    expect(dam.dam_type).toBe("gravity dam");
    expect(dam.height_m).toBe(285);
    expect(dam.crest_length_m).toBe(695);
    expect(dam.reservoir).toBe("Grande Dixence");
    expect(dam.volume_million_m3).toBe(385);
    expect(dam.canton).toBe("VS");
    expect(dam.year_built).toBe(1961);
  });

  it("includes count and source", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    expect(result.count).toBe(1);
    expect(result.total_found).toBe(1);
    expect(result.source).toContain("geo.admin.ch");
    expect(result.source).toContain("stauanlagen-bundesaufsicht");
  });

  it("falls back to reservoirname when damname returns nothing", async () => {
    // first call (damname) empty, second call (reservoirname) has results, then canton identify x2
    mockFetchSequence(
      mockDamSearchEmpty,
      mockDamSearchGrimsel,
      mockCantonIdentifyBE,
      mockCantonIdentifyBE,
    );
    const result = JSON.parse(await handleDams("search_dams", { query: "Grimsel" }));
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].reservoir).toBe("Grimsel");
  });

  it("returns helpful message when no results found", async () => {
    mockFetchSequence(mockDamSearchEmpty, mockDamSearchEmpty);
    const result = JSON.parse(await handleDams("search_dams", { query: "Nonexistent123" }));
    expect(result.results).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(result.message).toContain("No dams found");
    expect(result.message).toContain("Nonexistent123");
  });

  it("throws when query is missing", async () => {
    await expect(handleDams("search_dams", {})).rejects.toThrow("query is required");
  });

  it("throws when query is empty string", async () => {
    await expect(handleDams("search_dams", { query: "" })).rejects.toThrow("query is required");
  });

  it("handles canton identify failure gracefully (canton is null)", async () => {
    // findDams succeeds but identify fails
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200, statusText: "OK",
        json: () => Promise.resolve(mockDamSearchByName),
      })
      .mockRejectedValueOnce(new Error("network error")),
    );
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    expect(result.results[0].canton).toBeNull();
  });

  it("returns dam purpose field", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    expect(result.results[0].purpose).toBe("hydroelectricity");
  });

  it("returns facility field", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    expect(result.results[0].facility).toBe("Grande Dixence");
  });

  it("handles dam with no geometry (canton is null, no identify call)", async () => {
    // Return a dam with no geometry — clone and remove geometry
    const noGeomResult = {
      results: [{ ...grandeDixenceDam, geometry: undefined }],
    };
    mockFetch(noGeomResult);
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    expect(result.results[0].canton).toBeNull();
  });

  it("returns 500 HTTP error from fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500, statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    }));
    await expect(handleDams("search_dams", { query: "Grimsel" })).rejects.toThrow("HTTP 500");
  });
});

// ── get_dams_by_canton ───────────────────────────────────────────────────────

describe("get_dams_by_canton", () => {
  it("returns dams in canton VS", async () => {
    // canton find (no geom), canton find (with geom/bbox), all dams, (no identify needed)
    mockFetchSequence(
      mockCantonFindVS,
      mockCantonFindWithBboxVS,
      mockAllDamsWithGeometry,
    );
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.canton).toBe("VS");
    expect(Array.isArray(result.dams)).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    // Grande Dixence (597249, 103229) is within VS bbox [548579..679786, 78560..167428]
    const names = result.dams.map((d: { dam_name: string }) => d.dam_name);
    expect(names).toContain("Grande Dixence");
  });

  it("includes source link", async () => {
    mockFetchSequence(mockCantonFindVS, mockCantonFindWithBboxVS, mockAllDamsWithGeometry);
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.source).toContain("geo.admin.ch");
  });

  it("uppercase-normalises canton code", async () => {
    mockFetchSequence(mockCantonFindVS, mockCantonFindWithBboxVS, mockAllDamsWithGeometry);
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "vs" }));
    expect(result.canton).toBe("VS");
  });

  it("returns helpful message when no dams in canton", async () => {
    // Empty bbox result that filters all dams out — use a bbox that excludes all
    const emptyBboxCanton = {
      results: [{
        featureId: 99, id: 99,
        bbox: [800000, 280000, 810000, 290000] as [number, number, number, number],
        attributes: { ak: "AI", name: "Appenzell Innerrhoden", flaeche: 172.0, label: "AI" },
      }],
    };
    mockFetchSequence(
      { results: [{ featureId: 99, id: 99, attributes: { ak: "AI", name: "AI", flaeche: 172, label: "AI" } }] },
      emptyBboxCanton,
      mockAllDamsWithGeometry,
    );
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "AI" }));
    expect(result.dams).toHaveLength(0);
    expect(result.message).toContain("No dams found");
  });

  it("throws when canton is missing", async () => {
    await expect(handleDams("get_dams_by_canton", {})).rejects.toThrow("canton is required");
  });

  it("throws when canton is empty string", async () => {
    await expect(handleDams("get_dams_by_canton", { canton: "" })).rejects.toThrow("canton is required");
  });

  it("throws when canton code format is invalid (too long)", async () => {
    await expect(
      handleDams("get_dams_by_canton", { canton: "VVS" })
    ).rejects.toThrow("2-letter");
  });

  it("throws when canton code format is invalid (number)", async () => {
    await expect(
      handleDams("get_dams_by_canton", { canton: "12" })
    ).rejects.toThrow("2-letter");
  });

  it("throws when canton code not found in API", async () => {
    mockFetchSequence(mockCantonFindEmpty, mockCantonFindEmpty);
    await expect(
      handleDams("get_dams_by_canton", { canton: "XX" })
    ).rejects.toThrow("Unknown canton code");
  });

  it("limits results to 20 max", async () => {
    // Create 25 dam results all within VS bbox
    const manyDams = {
      results: Array.from({ length: 25 }, (_, i) => ({
        ...grandeDixenceDam,
        featureId: 100 + i,
        id: 100 + i,
        geometry: { x: 600000 + i * 100, y: 100000, spatialReference: { wkid: 21781 } },
        attributes: { ...grandeDixenceDam.attributes, damname: `Dam${i}` },
      })),
    };
    mockFetchSequence(mockCantonFindVS, mockCantonFindWithBboxVS, manyDams);
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.dams.length).toBeLessThanOrEqual(20);
    expect(result.total_in_canton).toBe(25);
  });

  it("skips dams without geometry when filtering", async () => {
    mockFetchSequence(mockCantonFindVS, mockCantonFindWithBboxVS, mockAllDamsNoGeometry);
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    // damNoGeometry has no geometry.x, so it's excluded
    expect(result.dams).toHaveLength(0);
  });

  it("sets canton code on each dam result", async () => {
    mockFetchSequence(mockCantonFindVS, mockCantonFindWithBboxVS, mockAllDamsWithGeometry);
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    for (const dam of result.dams) {
      expect(dam.canton).toBe("VS");
    }
  });
});

// ── get_dam_details ──────────────────────────────────────────────────────────

describe("get_dam_details", () => {
  it("returns full dam details with all fields", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.found).toBe(true);
    expect(result.dam_name).toBe("Grande Dixence");
    expect(result.height_m).toBe(285);
    expect(result.crest_length_m).toBe(695);
  });

  it("includes dam_type with multilingual object", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.dam_type).toBeDefined();
    expect(result.dam_type.english).toBe("gravity dam");
    expect(result.dam_type.german).toBe("Gewichtsmauer");
    expect(result.dam_type.french).toBe("barrage poids");
  });

  it("includes reservoir details", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.reservoir).toBeDefined();
    expect(result.reservoir.name).toBe("Grande Dixence");
    expect(result.reservoir.volume_million_m3).toBe(385);
    expect(result.reservoir.impoundment_level_masl).toBe(2364);
    expect(result.reservoir.storage_level_masl).toBe(284);
  });

  it("includes operation details", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.operation).toBeDefined();
    expect(result.operation.year_built).toBe(1961);
    expect(result.operation.beginning_of_operation).toBe("1961-01-01");
    expect(result.operation.start_of_federal_supervision).toBe("1972-07-10");
  });

  it("includes canton from coordinate identify", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.canton).toBe("VS");
  });

  it("includes purpose with multilingual object", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.purpose).toBeDefined();
    expect(result.purpose.english).toBe("hydroelectricity");
    expect(result.purpose.german).toBe("Hydroelektrizität");
  });

  it("includes feature_id", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.feature_id).toBe(130676916);
  });

  it("includes source URL", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.source).toContain("geo.admin.ch");
    expect(result.source).toContain("130676916");
  });

  it("returns found:false when dam not found after both searches", async () => {
    // damname → empty, facilityname → empty
    mockFetchSequence(mockDamSearchEmpty, mockDamSearchEmpty);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Nonexistent Dam" }));
    expect(result.found).toBe(false);
    expect(result.name).toBe("Nonexistent Dam");
    expect(result.message).toContain("No dam found");
    expect(result.message).toContain("Nonexistent Dam");
  });

  it("prefers exact name match when multiple dams returned", async () => {
    // Multiple results, one exact match
    mockFetchSequence(mockDamSearchGrimsel, mockCantonIdentifyBE);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Spitallamm" }));
    expect(result.found).toBe(true);
    expect(result.dam_name).toBe("Spitallamm");
  });

  it("falls back to facilityname search when damname returns no results", async () => {
    // damname search empty, facilityname search returns result
    mockFetchSequence(mockDamSearchEmpty, mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.found).toBe(true);
  });

  it("throws when name is missing", async () => {
    await expect(handleDams("get_dam_details", {})).rejects.toThrow("name is required");
  });

  it("throws when name is empty string", async () => {
    await expect(handleDams("get_dam_details", { name: "" })).rejects.toThrow("name is required");
  });

  it("includes crest_level_masl field", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.crest_level_masl).toBe(2365);
  });

  it("includes facility_name field", async () => {
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.facility_name).toBe("Grande Dixence");
  });

  it("handles canton identify failure (canton is null)", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200, statusText: "OK",
        json: () => Promise.resolve(mockDamSearchByName),
      })
      .mockRejectedValueOnce(new Error("timeout")),
    );
    const result = JSON.parse(await handleDams("get_dam_details", { name: "Grande Dixence" }));
    expect(result.found).toBe(true);
    expect(result.canton).toBeNull();
  });
});

// ── unknown tool ─────────────────────────────────────────────────────────────

describe("handleDams unknown tool", () => {
  it("throws for unknown tool name", async () => {
    await expect(handleDams("unknown_tool", {})).rejects.toThrow("Unknown dams tool");
  });
});
