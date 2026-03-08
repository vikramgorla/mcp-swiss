import { describe, it, expect, vi, afterEach } from "vitest";
import { handlePost, postTools } from "../../src/modules/post.js";
import {
  mockPlzFindResponse,
  mockSearchZipcodeResponse,
  mockCantonIdentifyResponse,
  mockSearchByNameResponse,
  mockCantonFindResponse,
  mockPlzInCantonResponse,
  mockEmptyResults,
} from "../fixtures/post.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Queues multiple fetch responses. Each call to fetch() consumes the next
 * payload in order, allowing us to mock multi-step tool handlers.
 */
function mockFetchSequence(...payloads: unknown[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const payload = payloads[call] ?? mockEmptyResults;
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

// ── postTools export ──────────────────────────────────────────────────────────

describe("postTools", () => {
  it("exports an array of 4 tools", () => {
    expect(Array.isArray(postTools)).toBe(true);
    expect(postTools).toHaveLength(4);
  });

  it("has required tool names", () => {
    const names = postTools.map((t) => t.name);
    expect(names).toContain("lookup_postcode");
    expect(names).toContain("search_postcode");
    expect(names).toContain("list_postcodes_in_canton");
  });

  it("all tools have inputSchema", () => {
    for (const tool of postTools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
  });
});

// ── lookup_postcode ───────────────────────────────────────────────────────────

describe("lookup_postcode", () => {
  it("returns found:true with full info for valid PLZ", async () => {
    mockFetchSequence(
      mockPlzFindResponse,
      mockSearchZipcodeResponse,
      mockCantonIdentifyResponse
    );
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.found).toBe(true);
    expect(result.postcode).toBe(8001);
    expect(result.locality).toBe("Zürich");
  });

  it("includes canton code and name", async () => {
    mockFetchSequence(
      mockPlzFindResponse,
      mockSearchZipcodeResponse,
      mockCantonIdentifyResponse
    );
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.canton).toBeDefined();
    expect(result.canton.code).toBe("ZH");
    expect(result.canton.name).toBe("Zürich");
  });

  it("includes WGS84 coordinates", async () => {
    mockFetchSequence(
      mockPlzFindResponse,
      mockSearchZipcodeResponse,
      mockCantonIdentifyResponse
    );
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.coordinates).toBeDefined();
    expect(result.coordinates.lat).toBeCloseTo(47.373, 2);
    expect(result.coordinates.lon).toBeCloseTo(8.542, 2);
  });

  it("includes source attribution", async () => {
    mockFetchSequence(
      mockPlzFindResponse,
      mockSearchZipcodeResponse,
      mockCantonIdentifyResponse
    );
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.source).toContain("swisstopo");
  });

  it("returns found:false for unknown PLZ", async () => {
    mockFetchSequence(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "9999" })
    );
    expect(result.found).toBe(false);
    expect(result.postcode).toBe("9999");
  });

  it("throws for non-4-digit postcode", async () => {
    await expect(handlePost("lookup_postcode", { postcode: "800" })).rejects.toThrow(
      "Invalid Swiss postcode"
    );
    await expect(handlePost("lookup_postcode", { postcode: "ABC1" })).rejects.toThrow(
      "Invalid Swiss postcode"
    );
  });

  it("passes PLZ as searchText to MapServer/find", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: "OK",
      json: () => Promise.resolve(mockPlzFindResponse),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handlePost("lookup_postcode", { postcode: "3000" }).catch(() => {});
    const firstUrl = fetchMock.mock.calls[0][0] as string;
    expect(firstUrl).toContain("searchText=3000");
    expect(firstUrl).toContain("searchField=plz");
  });

  it("uses origins=zipcode filter for SearchServer call", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("MapServer/find")) {
        return Promise.resolve({
          ok: true, status: 200, statusText: "OK",
          json: () => Promise.resolve(mockPlzFindResponse),
        });
      }
      if (url.includes("SearchServer")) {
        return Promise.resolve({
          ok: true, status: 200, statusText: "OK",
          json: () => Promise.resolve(mockSearchZipcodeResponse),
        });
      }
      return Promise.resolve({
        ok: true, status: 200, statusText: "OK",
        json: () => Promise.resolve(mockCantonIdentifyResponse),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    await handlePost("lookup_postcode", { postcode: "8001" });
    const searchCall = fetchMock.mock.calls.find(([url]: [string]) =>
      url.includes("SearchServer")
    );
    expect(searchCall).toBeDefined();
    expect(searchCall![0]).toContain("origins=zipcode");
  });

  it("handles null canton gracefully when identify returns no results", async () => {
    mockFetchSequence(
      mockPlzFindResponse,
      mockSearchZipcodeResponse,
      mockEmptyResults // identify returns nothing
    );
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.found).toBe(true);
    expect(result.canton).toBeNull();
  });
});

// ── search_postcode ───────────────────────────────────────────────────────────

describe("search_postcode", () => {
  it("returns count and results array", async () => {
    mockFetch(mockSearchByNameResponse);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it("each result has postcode and locality", async () => {
    mockFetch(mockSearchByNameResponse);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    for (const r of result.results) {
      expect(typeof r.postcode).toBe("number");
      expect(typeof r.locality).toBe("string");
    }
  });

  it("deduplicates by PLZ", async () => {
    // Two records with same PLZ
    const dupes = {
      results: [
        { ...mockSearchByNameResponse.results[0] },
        { ...mockSearchByNameResponse.results[0] }, // duplicate PLZ 8001
        { ...mockSearchByNameResponse.results[1] },
      ],
    };
    mockFetch(dupes);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    const codes = result.results.map((r: { postcode: number }) => r.postcode);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });

  it("returns empty results for unknown city", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Xyznotacity" })
    );
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("includes query in response", async () => {
    mockFetch(mockSearchByNameResponse);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Bern" })
    );
    expect(result.query).toBe("Bern");
  });

  it("passes city name as searchText with langtext field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: "OK",
      json: () => Promise.resolve(mockSearchByNameResponse),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handlePost("search_postcode", { city_name: "Locarno" });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("searchText=Locarno");
    expect(calledUrl).toContain("searchField=langtext");
  });

  it("throws for empty city_name", async () => {
    await expect(handlePost("search_postcode", { city_name: "" })).rejects.toThrow(
      "city_name must not be empty"
    );
  });

  it("includes source attribution", async () => {
    mockFetch(mockSearchByNameResponse);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    expect(result.source).toContain("swisstopo");
  });
});

// ── list_postcodes_in_canton ──────────────────────────────────────────────────

describe("list_postcodes_in_canton", () => {
  it("returns canton info, count and sorted postcodes", async () => {
    mockFetchSequence(mockCantonFindResponse, mockPlzInCantonResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.canton.code).toBe("ZH");
    expect(result.canton.name).toBe("Zürich");
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.postcodes)).toBe(true);
  });

  it("postcodes are sorted ascending", async () => {
    mockFetchSequence(mockCantonFindResponse, mockPlzInCantonResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    const codes = result.postcodes.map((p: { postcode: number }) => p.postcode);
    const sorted = [...codes].sort((a, b) => a - b);
    expect(codes).toEqual(sorted);
  });

  it("each postcode entry has postcode and locality", async () => {
    mockFetchSequence(mockCantonFindResponse, mockPlzInCantonResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    for (const p of result.postcodes) {
      expect(typeof p.postcode).toBe("number");
      expect(typeof p.locality).toBe("string");
    }
  });

  it("deduplicates by PLZ", async () => {
    const dupedPlz = {
      results: [
        ...mockPlzInCantonResponse.results,
        { ...mockPlzInCantonResponse.results[0] }, // duplicate 8001
      ],
    };
    mockFetchSequence(mockCantonFindResponse, dupedPlz);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    const codes = result.postcodes.map((p: { postcode: number }) => p.postcode);
    expect(codes.length).toBe(new Set(codes).size);
  });

  it("accepts full canton name (case-insensitive)", async () => {
    mockFetchSequence(mockCantonFindResponse, mockPlzInCantonResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "zürich" })
    );
    expect(result.canton.code).toBe("ZH");
  });

  it("accepts lowercase 2-letter code", async () => {
    mockFetchSequence(mockCantonFindResponse, mockPlzInCantonResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "zh" })
    );
    expect(result.canton.code).toBe("ZH");
  });

  it("throws for unresolvable canton name", async () => {
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "not-a-canton-name" })
    ).rejects.toThrow("Unknown canton");
  });

  it("queries canton layer with uppercase code", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true, status: 200, statusText: "OK",
        json: () => Promise.resolve(mockCantonFindResponse),
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    await handlePost("list_postcodes_in_canton", { canton: "zh" }).catch(() => {});
    const firstUrl = fetchMock.mock.calls[0][0] as string;
    expect(firstUrl).toContain("searchText=ZH");
    expect(firstUrl).toContain("searchField=ak");
  });

  it("includes source attribution", async () => {
    mockFetchSequence(mockCantonFindResponse, mockPlzInCantonResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.source).toContain("swisstopo");
  });

  it("throws for empty canton", async () => {
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "" })
    ).rejects.toThrow("canton must not be empty");
  });

  it("throws 'Canton not found' when canton API returns empty results", async () => {
    // First fetch (canton find) returns empty results → triggers line 324 throw
    mockFetchSequence(mockEmptyResults);
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "ZH" })
    ).rejects.toThrow(/Canton not found/);
  });
});

// ── track_parcel ──────────────────────────────────────────────────────────────

describe("track_parcel", () => {
  it("is listed in postTools", () => {
    const tool = postTools.find((t) => t.name === "track_parcel");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain("tracking_number");
  });

  it("returns tracking URL for a standard parcel number", async () => {
    const result = JSON.parse(
      await handlePost("track_parcel", { tracking_number: "99.00.123456.12345678" })
    );
    expect(result.tracking_url).toBe(
      "https://service.post.ch/ekp-web/ui/entry/shipping/1/parcel/detail?parcelId=99.00.123456.12345678"
    );
    expect(result.tracking_number).toBe("99.00.123456.12345678");
  });

  it("returns tracking URL for registered mail number", async () => {
    const result = JSON.parse(
      await handlePost("track_parcel", { tracking_number: "RI 123456789 CH" })
    );
    expect(result.tracking_url).toContain("service.post.ch");
    expect(result.tracking_url).toContain("RI%20123456789%20CH");
    expect(result.tracking_number).toBe("RI 123456789 CH");
  });

  it("includes a note about no public API", async () => {
    const result = JSON.parse(
      await handlePost("track_parcel", { tracking_number: "99.00.123456.12345678" })
    );
    expect(result.note).toContain("Swiss Post does not provide a public tracking API");
  });

  it("includes formats info", async () => {
    const result = JSON.parse(
      await handlePost("track_parcel", { tracking_number: "99.00.123456.12345678" })
    );
    expect(result.formats).toBeTruthy();
    expect(result.formats).toContain("99.xx");
  });

  it("throws for empty tracking number", async () => {
    await expect(
      handlePost("track_parcel", { tracking_number: "" })
    ).rejects.toThrow("tracking_number must not be empty");
  });

  it("throws when tracking_number is missing", async () => {
    await expect(
      handlePost("track_parcel", {})
    ).rejects.toThrow("tracking_number must not be empty");
  });
});

// ── args ?? "" fallback branches ─────────────────────────────────────────────

describe("post: args undefined fallback paths (??  '' branches)", () => {
  it("lookup_postcode: undefined postcode arg hits ?? '' and fails validation", async () => {
    await expect(
      handlePost("lookup_postcode", {}) // no postcode key
    ).rejects.toThrow("Invalid Swiss postcode");
  });

  it("search_postcode: undefined city_name arg hits ?? '' and throws empty error", async () => {
    await expect(
      handlePost("search_postcode", {}) // no city_name key
    ).rejects.toThrow("city_name must not be empty");
  });

  it("list_postcodes_in_canton: undefined canton arg hits ?? '' and throws empty error", async () => {
    await expect(
      handlePost("list_postcodes_in_canton", {}) // no canton key
    ).rejects.toThrow("canton must not be empty");
  });
});

// ── lookup_postcode: no coordinates branch ────────────────────────────────────

describe("lookup_postcode — no coordinates branch", () => {
  it("returns null coordinates when SearchServer returns no zipcode-origin entry", async () => {
    const emptySearchResponse = { results: [] };
    mockFetchSequence(mockPlzFindResponse, emptySearchResponse);
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.found).toBe(true);
    expect(result.coordinates).toBeNull();
    expect(result.canton).toBeNull();
  });
});

// ── search_postcode: zusziff branch ──────────────────────────────────────────

describe("search_postcode — zusziff branch", () => {
  it("includes additionalNumber when zusziff is not '00'", async () => {
    const responseWithZusziff = {
      results: [
        {
          featureId: "100",
          id: "100",
          layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
          layerName: "Amtliches Ortschaftenverzeichnis",
          attributes: {
            plz: 1234,
            zusziff: "01",
            langtext: "Testort",
            status: "REAL",
            modified: "01.01.2026",
            label: 1234,
          },
        },
      ],
    };
    mockFetch(responseWithZusziff);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Testort" })
    );
    expect(result.results[0].additionalNumber).toBe("01");
  });
});

// ── list_postcodes_in_canton: ≥200 results note ───────────────────────────────

describe("list_postcodes_in_canton — capped results note", () => {
  it("includes note when result count is exactly 200", async () => {
    const bigPlzResponse = {
      results: Array.from({ length: 200 }, (_, i) => ({
        featureId: String(i),
        id: String(i),
        layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
        layerName: "Amtliches Ortschaftenverzeichnis",
        attributes: {
          plz: 8000 + i,
          zusziff: "00",
          langtext: `Ort ${i}`,
          status: "REAL",
          modified: "01.01.2026",
          label: 8000 + i,
        },
      })),
    };
    mockFetchSequence(mockCantonFindResponse, bigPlzResponse);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.count).toBe(200);
    expect(result.note).toContain("capped at 200");
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe("unknown post tool", () => {
  it("throws for unrecognized tool name", async () => {
    await expect(handlePost("does_not_exist", {})).rejects.toThrow(
      "Unknown post tool: does_not_exist"
    );
  });
});
