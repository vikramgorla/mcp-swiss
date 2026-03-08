import { describe, it, expect, vi, afterEach } from "vitest";
import { handleHiking, hikingTools, wgs84ToLv95 } from "../../src/modules/hiking.js";
import {
  mockFindResponse,
  mockFindResponseSingle,
  mockFindResponseEmpty,
  mockFindResponseDetourOnly,
  expectedSlimClosure,
  expectedSlimDetour,
  BERN_LAT,
  BERN_LON,
  BERN_LV95_E_APPROX,
  BERN_LV95_N_APPROX,
  ZURICH_LAT,
  ZURICH_LON,
  ZURICH_LV95_E_APPROX,
  ZURICH_LV95_N_APPROX,
} from "../fixtures/hiking.js";

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Server Error",
      json: () => Promise.resolve(payload),
    })
  );
}

function mockFetchSequence(payloads: unknown[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const payload = payloads[call] ?? payloads[payloads.length - 1];
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

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── hikingTools definitions ───────────────────────────────────────────────────

describe("hikingTools", () => {
  it("exports exactly 2 tools", () => {
    expect(hikingTools).toHaveLength(2);
  });

  it("has get_trail_closures tool", () => {
    const tool = hikingTools.find((t) => t.name === "get_trail_closures");
    expect(tool).toBeDefined();
    expect(tool?.description).toContain("ASTRA");
    expect(tool?.inputSchema.type).toBe("object");
  });

  it("has get_trail_closures_nearby tool", () => {
    const tool = hikingTools.find((t) => t.name === "get_trail_closures_nearby");
    expect(tool).toBeDefined();
    expect(tool?.description).toContain("GPS");
    expect(tool?.inputSchema.type).toBe("object");
  });

  it("get_trail_closures has reason, type, limit properties", () => {
    const tool = hikingTools.find((t) => t.name === "get_trail_closures");
    const props = tool?.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("reason");
    expect(props).toHaveProperty("type");
    expect(props).toHaveProperty("limit");
  });

  it("get_trail_closures type has enum closure/detour", () => {
    const tool = hikingTools.find((t) => t.name === "get_trail_closures");
    const typeProp = (tool?.inputSchema.properties as Record<string, { enum?: string[] }>)?.type;
    expect(typeProp?.enum).toEqual(["closure", "detour"]);
  });

  it("get_trail_closures_nearby has lat, lon, radius properties", () => {
    const tool = hikingTools.find((t) => t.name === "get_trail_closures_nearby");
    const props = tool?.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("lat");
    expect(props).toHaveProperty("lon");
    expect(props).toHaveProperty("radius");
  });

  it("get_trail_closures_nearby has lat and lon as required", () => {
    const tool = hikingTools.find((t) => t.name === "get_trail_closures_nearby");
    expect(tool?.inputSchema.required).toContain("lat");
    expect(tool?.inputSchema.required).toContain("lon");
  });
});

// ── wgs84ToLv95 ───────────────────────────────────────────────────────────────

describe("wgs84ToLv95", () => {
  it("converts Bern coordinates to approximate LV95", () => {
    const [e, n] = wgs84ToLv95(BERN_LAT, BERN_LON);
    expect(Math.abs(e - BERN_LV95_E_APPROX)).toBeLessThan(100);
    expect(Math.abs(n - BERN_LV95_N_APPROX)).toBeLessThan(100);
  });

  it("converts Zurich coordinates to approximate LV95", () => {
    const [e, n] = wgs84ToLv95(ZURICH_LAT, ZURICH_LON);
    expect(Math.abs(e - ZURICH_LV95_E_APPROX)).toBeLessThan(100);
    expect(Math.abs(n - ZURICH_LV95_N_APPROX)).toBeLessThan(100);
  });

  it("E coordinate is in Swiss range (2480000–2840000)", () => {
    const [e] = wgs84ToLv95(46.8, 8.2);
    expect(e).toBeGreaterThan(2480000);
    expect(e).toBeLessThan(2840000);
  });

  it("N coordinate is in Swiss range (1070000–1300000)", () => {
    const [, n] = wgs84ToLv95(46.8, 8.2);
    expect(n).toBeGreaterThan(1070000);
    expect(n).toBeLessThan(1300000);
  });

  it("returns a tuple of exactly 2 numbers", () => {
    const result = wgs84ToLv95(47.0, 8.0);
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe("number");
    expect(typeof result[1]).toBe("number");
  });
});

// ── get_trail_closures ────────────────────────────────────────────────────────

describe("get_trail_closures", () => {
  it("returns count, total_found, filter, source, closures", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("total_found");
    expect(result).toHaveProperty("filter");
    expect(result).toHaveProperty("source");
    expect(result).toHaveProperty("closures");
    expect(Array.isArray(result.closures)).toBe(true);
  });

  it("source mentions ASTRA and swisstopo", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result.source).toContain("ASTRA");
    expect(result.source).toContain("swisstopo");
  });

  it("each closure has id, title, reason, duration, type, type_raw, description", async () => {
    mockFetchSequence([mockFindResponseSingle, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result.closures.length).toBeGreaterThan(0);
    const c = result.closures[0];
    expect(c).toHaveProperty("id");
    expect(c).toHaveProperty("title");
    expect(c).toHaveProperty("reason");
    expect(c).toHaveProperty("duration");
    expect(c).toHaveProperty("type");
    expect(c).toHaveProperty("type_raw");
    expect(c).toHaveProperty("description");
  });

  it("maps closure attributes correctly", async () => {
    mockFetchSequence([mockFindResponseSingle, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    const c = result.closures[0];
    expect(c.id).toBe(expectedSlimClosure.id);
    expect(c.title).toBe(expectedSlimClosure.title);
    expect(c.reason).toBe(expectedSlimClosure.reason);
    expect(c.duration).toBe(expectedSlimClosure.duration);
    expect(c.type).toBe(expectedSlimClosure.type);
    expect(c.type_raw).toBe(expectedSlimClosure.type_raw);
  });

  it("maps detour attributes correctly", async () => {
    mockFetchSequence([mockFindResponseDetourOnly, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", { type: "detour" }));
    if (result.closures.length > 0) {
      const c = result.closures[0];
      expect(c.type_raw).toBe("detour");
      expect(c.reason).toBe(expectedSlimDetour.reason);
    }
  });

  it("returns empty closures list when API returns no results", async () => {
    mockFetchSequence([mockFindResponseEmpty, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result.closures).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  it("filter reflects applied reason", async () => {
    mockFetchSequence([mockFindResponseSingle, mockFindResponseEmpty]);
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { reason: "Steinschlag" })
    );
    expect(result.filter.reason).toBe("Steinschlag");
  });

  it("filter reflects applied type", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { type: "closure" })
    );
    expect(result.filter.type).toBe("closure");
  });

  it("filter reason is null when not provided", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result.filter.reason).toBeNull();
  });

  it("filter type is null when not provided", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result.filter.type).toBeNull();
  });

  it("respects limit parameter", async () => {
    // Return 2 items but limit=1
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { limit: 1 })
    );
    expect(result.closures.length).toBeLessThanOrEqual(1);
    expect(result.filter.limit).toBe(1);
  });

  it("default limit is 20", async () => {
    mockFetchSequence([mockFindResponseEmpty, mockFindResponseEmpty]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result.filter.limit).toBe(20);
  });

  it("caps limit at 100", async () => {
    mockFetchSequence([mockFindResponseEmpty, mockFindResponseEmpty]);
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { limit: 999 })
    );
    expect(result.filter.limit).toBe(100);
  });

  it("type=closure filters to only closed_way entries", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { type: "closure" })
    );
    for (const c of result.closures) {
      expect(c.type_raw).toBe("closed_way");
    }
  });

  it("type=detour filters to only detour entries", async () => {
    // First call (broad search): returns both; second call: also returns detour
    mockFetchSequence([mockFindResponse, mockFindResponseDetourOnly]);
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { type: "detour" })
    );
    for (const c of result.closures) {
      expect(c.type_raw).toBe("detour");
    }
  });

  it("deduplicates results with same featureId", async () => {
    // Both calls return the same single closure → should appear only once
    mockFetchSequence([mockFindResponseSingle, mockFindResponseSingle]);
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    const ids = result.closures.map((c: { id: number }) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("calls API with searchField=reason_de when reason is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockFindResponseEmpty),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleHiking("get_trail_closures", { reason: "Steinschlag" });
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    const hasReasonDe = urls.some((u) => u.includes("searchField=reason_de"));
    expect(hasReasonDe).toBe(true);
  });

  it("calls API with searchField=reason_en when reason is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockFindResponseEmpty),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleHiking("get_trail_closures", { reason: "rockfall" });
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    const hasReasonEn = urls.some((u) => u.includes("searchField=reason_en"));
    expect(hasReasonEn).toBe(true);
  });

  it("response is valid JSON", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const raw = await handleHiking("get_trail_closures", {});
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("response is under 50K chars", async () => {
    mockFetchSequence([mockFindResponse, mockFindResponseEmpty]);
    const raw = await handleHiking("get_trail_closures", {});
    expect(raw.length).toBeLessThan(50000);
  });

  it("throws on HTTP error", async () => {
    mockFetch(null, 500);
    await expect(handleHiking("get_trail_closures", {})).rejects.toThrow("HTTP 500");
  });
});

// ── get_trail_closures_nearby ─────────────────────────────────────────────────

describe("get_trail_closures_nearby", () => {
  it("returns count, query, source, closures", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("query");
    expect(result).toHaveProperty("source");
    expect(result).toHaveProperty("closures");
    expect(Array.isArray(result.closures)).toBe(true);
  });

  it("query contains lat, lon, radius_m, lv95_e, lv95_n", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(result.query.lat).toBe(BERN_LAT);
    expect(result.query.lon).toBe(BERN_LON);
    expect(result.query).toHaveProperty("radius_m");
    expect(result.query).toHaveProperty("lv95_e");
    expect(result.query).toHaveProperty("lv95_n");
  });

  it("lv95 coordinates are rounded integers", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(Number.isInteger(result.query.lv95_e)).toBe(true);
    expect(Number.isInteger(result.query.lv95_n)).toBe(true);
  });

  it("lv95_e is approximately correct for Bern", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(Math.abs(result.query.lv95_e - BERN_LV95_E_APPROX)).toBeLessThan(100);
  });

  it("default radius is 10000", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(result.query.radius_m).toBe(10000);
  });

  it("custom radius is applied", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", {
        lat: BERN_LAT,
        lon: BERN_LON,
        radius: 5000,
      })
    );
    expect(result.query.radius_m).toBe(5000);
  });

  it("caps radius at 50000", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", {
        lat: BERN_LAT,
        lon: BERN_LON,
        radius: 999999,
      })
    );
    expect(result.query.radius_m).toBe(50000);
  });

  it("each closure has id, title, reason, duration, type", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    for (const c of result.closures) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("title");
      expect(c).toHaveProperty("reason");
      expect(c).toHaveProperty("duration");
      expect(c).toHaveProperty("type");
    }
  });

  it("returns empty closures when no results nearby", async () => {
    mockFetch(mockFindResponseEmpty);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(result.closures).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  it("deduplicates when API returns duplicates", async () => {
    // Duplicate the same result
    mockFetch({ results: [mockFindResponse.results[0], mockFindResponse.results[0]] });
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    const ids = result.closures.map((c: { id: number }) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("source mentions ASTRA and swisstopo", async () => {
    mockFetch(mockFindResponse);
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(result.source).toContain("ASTRA");
    expect(result.source).toContain("swisstopo");
  });

  it("calls identify endpoint with LV95 geometry", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockFindResponseEmpty),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("identify");
    expect(url).toContain("ch.astra.wanderland-sperrungen_umleitungen");
    expect(url).toContain("sr=2056");
  });

  it("throws if lat is NaN", async () => {
    await expect(
      handleHiking("get_trail_closures_nearby", { lat: NaN, lon: 7.4 })
    ).rejects.toThrow("lat and lon must be valid numbers");
  });

  it("throws if lon is NaN", async () => {
    await expect(
      handleHiking("get_trail_closures_nearby", { lat: 47.0, lon: NaN })
    ).rejects.toThrow("lat and lon must be valid numbers");
  });

  it("throws if coordinates are outside Switzerland", async () => {
    await expect(
      handleHiking("get_trail_closures_nearby", { lat: 51.5, lon: -0.12 }) // London
    ).rejects.toThrow("outside Switzerland");
  });

  it("throws for out-of-range lat (too far south)", async () => {
    await expect(
      handleHiking("get_trail_closures_nearby", { lat: 44.0, lon: 8.0 })
    ).rejects.toThrow("outside Switzerland");
  });

  it("response is valid JSON", async () => {
    mockFetch(mockFindResponse);
    const raw = await handleHiking("get_trail_closures_nearby", {
      lat: BERN_LAT,
      lon: BERN_LON,
    });
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("response is under 50K chars", async () => {
    mockFetch(mockFindResponse);
    const raw = await handleHiking("get_trail_closures_nearby", {
      lat: BERN_LAT,
      lon: BERN_LON,
    });
    expect(raw.length).toBeLessThan(50000);
  });

  it("throws on HTTP error", async () => {
    mockFetch(null, 503);
    await expect(
      handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    ).rejects.toThrow("HTTP 503");
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe("error handling", () => {
  it("throws for unknown tool name", async () => {
    await expect(handleHiking("does_not_exist", {})).rejects.toThrow(
      "Unknown hiking tool: does_not_exist"
    );
  });
});
