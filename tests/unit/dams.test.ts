import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleDams, damsTools, clearDamsCache } from "../../src/modules/dams.js";
import {
  mockDamSearchByName,
  mockDamSearchGrimsel,
  mockDamSearchEmpty,
  mockCantonIdentifyVS,
  mockCantonIdentifyBE,
  mockCantonFindWithBboxVS,
  mockCantonFindEmpty,
  mockAllDamsWithGeometry,
  mockAllDamsNoGeometry,
  mockCantonIdentifyEmpty,
  grandeDixenceDam,
} from "../fixtures/dams.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Queue multiple fetch responses in order.
 */
function mockFetchSequence(...payloads: unknown[]) {
  let call = 0;
  const fetchMock = vi.fn().mockImplementation(() => {
    const payload = payloads[call] ?? { results: [] };
    call++;
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(payload),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** api3.geo.admin.ch never returns more than this in one response, on any endpoint. */
const API3_CAP = 201;

type DamRow = Omit<typeof grandeDixenceDam, "geometry"> & {
  geometry?: { x: number; y: number; spatialReference?: { wkid: number } };
};

function isDamLayerIdentify(u: URL): boolean {
  return u.pathname.endsWith("/identify") && !!u.searchParams.get("layers")?.includes("stauanlagen");
}

/** One page of the dam layer, capped the way the real endpoint caps it. */
function damLayerPage(rows: DamRow[], u: URL) {
  const offset = Number(u.searchParams.get("offset") ?? 0);
  return { results: rows.slice(offset, offset + API3_CAP) };
}

/**
 * Route each request by URL, so tests do not depend on call order.
 * `cantons` maps a "x,y" LV95 point to the canton the identify endpoint returns.
 * Both `find` and the dam-layer `identify` stop at 201 rows, as upstream does.
 */
function mockGeoAdmin(opts: {
  dams?: { results: DamRow[] };
  damsByField?: Record<string, unknown>;
  cantonFind?: unknown;
  cantons?: Record<string, string | null>;
}) {
  const damRows = opts.dams?.results ?? [];
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const u = new URL(String(url));
    let payload: unknown = { results: [] };

    if (isDamLayerIdentify(u)) {
      payload = damLayerPage(damRows, u);
    } else if (u.pathname.endsWith("/identify")) {
      const point = u.searchParams.get("geometry") ?? "";
      const code = opts.cantons?.[point] ?? null;
      payload = code
        ? { results: [{ layerBodId: "canton", featureId: 1, attributes: { ak: code, name: code, flaeche: 1, label: code } }] }
        : { results: [] };
    } else if (u.searchParams.get("layer")?.includes("kanton")) {
      payload = opts.cantonFind ?? { results: [] };
    } else {
      const field = u.searchParams.get("searchField") ?? "";
      const found = (opts.damsByField?.[field] ?? opts.dams ?? { results: [] }) as { results: DamRow[] };
      payload = { results: found.results.slice(0, API3_CAP) };
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(payload),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** `count` dams spread across the VS bounding box, one per 500 m. */
function damRows(count: number): DamRow[] {
  return Array.from({ length: count }, (_, i) => ({
    ...grandeDixenceDam,
    featureId: 200000 + i,
    id: 200000 + i,
    geometry: { x: 2550000 + i * 500, y: 1100000, spatialReference: { wkid: 2056 } },
    attributes: { ...grandeDixenceDam.attributes, damname: `Dam${i}` },
  }));
}

/** Canton per dam point: VS for the listed indices, BE for the rest. */
function cantonMap(rows: DamRow[], vsIndices: number[]): Record<string, string> {
  const vs = new Set(vsIndices);
  return Object.fromEntries(
    rows.map((row, i) => [`${row.geometry?.x},${row.geometry?.y}`, vs.has(i) ? "VS" : "BE"])
  );
}

function damLayerOffsets(fetchMock: { mock: { calls: unknown[][] } }): number[] {
  return fetchMock.mock.calls
    .map((call) => new URL(String(call[0])))
    .filter(isDamLayerIdentify)
    .map((u) => Number(u.searchParams.get("offset") ?? 0));
}

const VS_POINT = "2597249.3,1103229.9";
const MATTMARK_POINT = "2641000,1099000";
const SPITALLAMM_POINT = "2668300.3,1158269.7";

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(payload),
  }));
}

beforeEach(() => {
  clearDamsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearDamsCache();
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

  it("asks for geometry so the canton can be resolved", async () => {
    const fetchMock = mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    const result = JSON.parse(await handleDams("search_dams", { query: "Grande Dixence" }));
    const findUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(findUrl.searchParams.get("returnGeometry")).toBe("true");
    expect(result.results[0].canton).toBe("VS");
  });

  it("asks the canton layer in LV95, the frame the dam geometry comes in", async () => {
    const fetchMock = mockFetchSequence(mockDamSearchByName, mockCantonIdentifyVS);
    await handleDams("search_dams", { query: "Grande Dixence" });
    const identifyUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(identifyUrl.searchParams.get("sr")).toBe("2056");
    expect(identifyUrl.searchParams.get("geometry")).toBe("2597249.3,1103229.9");
  });

  it("leaves canton null when the point matches two cantons within the border tolerance", async () => {
    const twoCantons = {
      results: [...mockCantonIdentifyVS.results, ...mockCantonIdentifyBE.results],
    };
    mockFetchSequence(mockDamSearchByName, mockCantonIdentifyEmpty, twoCantons);
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
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams: mockAllDamsWithGeometry,
      cantons: { [VS_POINT]: "VS", [MATTMARK_POINT]: "VS", [SPITALLAMM_POINT]: "BE" },
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.canton).toBe("VS");
    const names = result.dams.map((d: { dam_name: string }) => d.dam_name);
    expect(names).toContain("Grande Dixence");
    expect(names).toContain("Mattmark");
  });

  it("drops a dam inside the bbox that the canton polygon does not contain", async () => {
    // Spitallamm (Grimsel) sits inside the VS bounding box but is in canton BE.
    const dams = {
      results: [...mockAllDamsWithGeometry.results],
    };
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams,
      cantons: { [VS_POINT]: "VS", [MATTMARK_POINT]: "VS", [SPITALLAMM_POINT]: "BE" },
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    const names = result.dams.map((d: { dam_name: string }) => d.dam_name);
    expect(names).not.toContain("Spitallamm");
    expect(result.count).toBe(2);
    expect(result.total_in_canton).toBe(2);
  });

  it("returns nothing when the bbox catches dams that all belong elsewhere", async () => {
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams: mockAllDamsWithGeometry,
      cantons: { [VS_POINT]: "BE", [MATTMARK_POINT]: "BE", [SPITALLAMM_POINT]: "BE" },
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.dams).toHaveLength(0);
    expect(result.message).toContain("No dams found");
  });

  it("keeps a dam on the national border and flags it", async () => {
    // First identify (tolerance 0) misses, the 300 m one hits — the Rhine plants.
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const u = new URL(String(url));
      let payload: unknown = { results: [] };
      if (isDamLayerIdentify(u)) {
        payload = damLayerPage(mockDamSearchByName.results, u);
      } else if (u.pathname.endsWith("/identify")) {
        const tolerance = Number(u.searchParams.get("tolerance"));
        payload = tolerance > 0 ? mockCantonIdentifyVS : mockCantonIdentifyEmpty;
      } else if (u.searchParams.get("layer")?.includes("kanton")) {
        payload = mockCantonFindWithBboxVS;
      } else {
        payload = mockDamSearchByName;
      }
      return Promise.resolve({
        ok: true, status: 200, statusText: "OK",
        json: () => Promise.resolve(payload),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.count).toBe(1);
    expect(result.dams[0].canton).toBe("VS");
    expect(result.dams[0].canton_on_national_border).toBe(true);
  });

  it("names the layer the canton was read from", async () => {
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams: mockAllDamsWithGeometry,
      cantons: { [VS_POINT]: "VS", [MATTMARK_POINT]: "VS", [SPITALLAMM_POINT]: "BE" },
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.source).toContain("geo.admin.ch");
    expect(result.canton_source).toContain("swissboundaries3d-kanton");
  });

  it("uppercase-normalises canton code", async () => {
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams: mockAllDamsWithGeometry,
      cantons: { [VS_POINT]: "VS", [MATTMARK_POINT]: "VS", [SPITALLAMM_POINT]: "BE" },
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "vs" }));
    expect(result.canton).toBe("VS");
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
    mockGeoAdmin({ cantonFind: mockCantonFindEmpty });
    await expect(
      handleDams("get_dams_by_canton", { canton: "XX" })
    ).rejects.toThrow("Unknown canton code");
  });

  it("limits results to 20 max", async () => {
    const manyDams = {
      results: Array.from({ length: 25 }, (_, i) => ({
        ...grandeDixenceDam,
        featureId: 100 + i,
        id: 100 + i,
        geometry: { x: 2600000 + i * 100, y: 1100000, spatialReference: { wkid: 2056 } },
        attributes: { ...grandeDixenceDam.attributes, damname: `Dam${i}` },
      })),
    };
    const cantons = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`${2600000 + i * 100},1100000`, "VS"])
    );
    mockGeoAdmin({ cantonFind: mockCantonFindWithBboxVS, dams: manyDams, cantons });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.dams.length).toBeLessThanOrEqual(20);
    expect(result.total_in_canton).toBe(25);
  });

  it("skips dams without geometry when filtering", async () => {
    mockGeoAdmin({ cantonFind: mockCantonFindWithBboxVS, dams: mockAllDamsNoGeometry });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    expect(result.dams).toHaveLength(0);
  });

  it("sets canton code on each dam result", async () => {
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams: mockAllDamsWithGeometry,
      cantons: { [VS_POINT]: "VS", [MATTMARK_POINT]: "VS", [SPITALLAMM_POINT]: "BE" },
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));
    for (const dam of result.dams) {
      expect(dam.canton).toBe("VS");
    }
  });

  it("reaches dams past the 201-row API cap", async () => {
    // The layer really does hold more than 201 rows; the tail used to be invisible.
    const dams = { results: damRows(225) };
    const fetchMock = mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams,
      cantons: cantonMap(dams.results, [0, 224]),
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS" }));

    const names = result.dams.map((d: { dam_name: string }) => d.dam_name);
    expect(names).toContain("Dam0");
    expect(names).toContain("Dam224");
    expect(result.total_in_canton).toBe(2);

    const offsets = damLayerOffsets(fetchMock);
    expect(offsets.length).toBeGreaterThan(1);
    expect(new Set(offsets).size).toBe(offsets.length);
  });

  it("stops after a short page", async () => {
    const dams = { results: damRows(150) };
    const fetchMock = mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams,
      cantons: cantonMap(dams.results, [0]),
    });
    await handleDams("get_dams_by_canton", { canton: "VS" });
    expect(damLayerOffsets(fetchMock)).toHaveLength(1);
  });

  it("returns more than the default 20 when limit is raised", async () => {
    const dams = { results: damRows(60) };
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams,
      cantons: cantonMap(dams.results, dams.results.map((_, i) => i)),
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS", limit: 50 }));
    expect(result.count).toBe(50);
    expect(result.total_in_canton).toBe(60);
    expect(result.note).toContain("50 of 60");
  });

  it("clamps limit to 100", async () => {
    const dams = { results: damRows(120) };
    mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams,
      cantons: cantonMap(dams.results, dams.results.map((_, i) => i)),
    });
    const result = JSON.parse(await handleDams("get_dams_by_canton", { canton: "VS", limit: 999 }));
    expect(result.count).toBe(100);
    expect(result.total_in_canton).toBe(120);
  });

  it("reuses the cached dam list and canton lookups across calls", async () => {
    const fetchMock = mockGeoAdmin({
      cantonFind: mockCantonFindWithBboxVS,
      dams: mockAllDamsWithGeometry,
      cantons: { [VS_POINT]: "VS", [MATTMARK_POINT]: "VS", [SPITALLAMM_POINT]: "BE" },
    });
    await handleDams("get_dams_by_canton", { canton: "VS" });
    const afterFirst = fetchMock.mock.calls.length;
    await handleDams("get_dams_by_canton", { canton: "VS" });
    // Only the canton bbox lookup is repeated.
    expect(fetchMock.mock.calls.length).toBe(afterFirst + 1);
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

  it("rejects when the dam is not found after both searches", async () => {
    // damname → empty, facilityname → empty
    mockFetchSequence(mockDamSearchEmpty, mockDamSearchEmpty);
    await expect(
      handleDams("get_dam_details", { name: "Nonexistent Dam" })
    ).rejects.toThrow('No dam named "Nonexistent Dam". Use search_dams to get the exact name.');
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
