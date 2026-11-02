import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handlePost, postTools, clearPostCache, readCsvFromZip } from "../../src/modules/post.js";
import {
  mockPlzFindResponse,
  mockSearchZipcodeResponse,
  mockCantonIdentifyResponse,
  mockSearchByNameResponse,
  mockEmptyResults,
  mockPlzRegisterZip,
  mockPlzRegisterCsv,
  buildRegisterZip,
} from "../fixtures/post.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

/** The PLZ register archive, served from data.geo.admin.ch. */
let registerZip: Buffer | null = null;

function registerResponse() {
  const zip = registerZip ?? mockPlzRegisterZip();
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    arrayBuffer: () => Promise.resolve(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength)),
  });
}

function isRegisterUrl(url: string): boolean {
  return url.includes("data.geo.admin.ch");
}

function mockFetchSequence(...payloads: unknown[]) {
  let call = 0;
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (isRegisterUrl(String(url))) return registerResponse();
    const payload = payloads[call] ?? mockEmptyResults;
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

function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (isRegisterUrl(String(url))) return registerResponse();
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(payload),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  registerZip = null;
  clearPostCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearPostCache();
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

  it("rejects for an unknown PLZ", async () => {
    mockFetchSequence(mockEmptyResults);
    await expect(
      handlePost("lookup_postcode", { postcode: "9999" })
    ).rejects.toThrow("No Swiss postcode 9999");
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

  it("handles null canton gracefully when the register and identify both miss", async () => {
    const unknownPlz = {
      results: [
        {
          ...mockPlzFindResponse.results[0],
          attributes: { ...mockPlzFindResponse.results[0].attributes, plz: 7777, label: 7777 },
        },
      ],
    };
    mockFetchSequence(
      unknownPlz,
      mockSearchZipcodeResponse,
      mockEmptyResults // identify returns nothing
    );
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "7777" })
    );
    expect(result.found).toBe(true);
    expect(result.canton).toBeNull();
  });

  it("reads the canton from the register, not from a point lookup", async () => {
    const fetchMock = mockFetchSequence(mockPlzFindResponse, mockSearchZipcodeResponse);
    const result = JSON.parse(await handlePost("lookup_postcode", { postcode: "8001" }));
    expect(result.canton.code).toBe("ZH");
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("data.geo.admin.ch"))).toBe(true);
    expect(urls.some((u) => u.includes("MapServer/identify"))).toBe(false);
  });

  it("reports the municipality and its BFS number", async () => {
    mockFetchSequence(mockPlzFindResponse, mockSearchZipcodeResponse);
    const result = JSON.parse(await handlePost("lookup_postcode", { postcode: "8001" }));
    expect(result.municipality).toEqual({ name: "Zürich", bfs_number: 261 });
  });

  it("lists the other cantons a postcode reaches into", async () => {
    const plz6417 = {
      results: [
        {
          ...mockPlzFindResponse.results[0],
          attributes: { ...mockPlzFindResponse.results[0].attributes, plz: 6417, langtext: "Sattel", label: 6417 },
        },
      ],
    };
    mockFetchSequence(plz6417, mockSearchZipcodeResponse);
    const result = JSON.parse(await handlePost("lookup_postcode", { postcode: "6417" }));
    expect(result.canton.code).toBe("SZ");
    expect(result.also_in_cantons).toEqual(["ZG"]);
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

  it("labels each result with the canton from the register", async () => {
    mockFetch(mockSearchByNameResponse);
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    expect(result.results[0]).toMatchObject({ postcode: 8001, canton: "ZH" });
    expect(result.results[1]).toMatchObject({ postcode: 8002, canton: "ZH" });
    // 8003 is not in the register slice — no canton is invented for it.
    expect(result.results[2].canton).toBeNull();
  });
});

// ── list_postcodes_in_canton ──────────────────────────────────────────────────

describe("list_postcodes_in_canton", () => {
  it("returns canton info, count and sorted postcodes", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.canton).toEqual({ code: "ZH", name: "Zürich" });
    expect(result.count).toBe(3);
    expect(result.postcodes.map((p: { postcode: number }) => p.postcode)).toEqual([8001, 8002, 8400]);
  });

  it("only returns postcodes the register puts in the canton", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZG" })
    );
    // 6417 (SZ) and 5642 (AG) overlap ZG but are not ZG postcodes.
    expect(result.postcodes.map((p: { postcode: number }) => p.postcode)).toEqual([6300]);
    expect(result.count).toBe(1);
  });

  it("lists overlapping postcodes separately, with their real canton", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZG" })
    );
    expect(result.partly_in_canton).toEqual([
      { postcode: 5642, locality: "Mühlau", main_canton: "AG", share_percent: 0.65 },
      { postcode: 6417, locality: "Sattel", main_canton: "SZ", share_percent: 1.16 },
    ]);
    expect(result.note).toContain("partly_in_canton");
  });

  it("omits partly_in_canton when nothing overlaps", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.partly_in_canton).toBeUndefined();
    expect(result.note).toBeUndefined();
  });

  it("uses the main locality name, not an additional-digit entry", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZG" })
    );
    expect(result.postcodes[0]).toEqual({ postcode: 6300, locality: "Zug" });
  });

  it("skips register rows with no canton (Liechtenstein)", async () => {
    mockFetch(mockEmptyResults);
    for (const canton of ["ZH", "ZG"]) {
      const result = JSON.parse(await handlePost("list_postcodes_in_canton", { canton }));
      const all = [...result.postcodes, ...(result.partly_in_canton ?? [])];
      expect(all.map((p: { postcode: number }) => p.postcode)).not.toContain(9490);
    }
  });

  it("postcodes are sorted ascending", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    const codes = result.postcodes.map((p: { postcode: number }) => p.postcode);
    expect(codes).toEqual([...codes].sort((a, b) => a - b));
  });

  it("each postcode entry has postcode and locality", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    for (const p of result.postcodes) {
      expect(typeof p.postcode).toBe("number");
      expect(typeof p.locality).toBe("string");
    }
  });

  it("accepts full canton name (case-insensitive)", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "zürich" })
    );
    expect(result.canton.code).toBe("ZH");
  });

  it("accepts lowercase 2-letter code", async () => {
    mockFetch(mockEmptyResults);
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

  it("rejects a two-letter string that is not a canton", async () => {
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "XX" })
    ).rejects.toThrow("Unknown canton");
  });

  it("downloads the register once and reuses it", async () => {
    const fetchMock = mockFetch(mockEmptyResults);
    await handlePost("list_postcodes_in_canton", { canton: "ZH" });
    await handlePost("list_postcodes_in_canton", { canton: "ZG" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("names the register and its download URL", async () => {
    mockFetch(mockEmptyResults);
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.source).toContain("Ortschaftenverzeichnis");
    expect(result.source_url).toContain("ortschaftenverzeichnis_plz");
  });

  it("throws for empty canton", async () => {
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "" })
    ).rejects.toThrow("canton must not be empty");
  });

  it("fails loudly when the register cannot be downloaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 503, statusText: "Service Unavailable",
      json: () => Promise.resolve({}),
    }));
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "ZH" })
    ).rejects.toThrow("HTTP 503");
  });

  it("rejects an archive without a CSV entry", async () => {
    registerZip = buildRegisterZip(mockPlzRegisterCsv, "readme.txt");
    mockFetch(mockEmptyResults);
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "ZH" })
    ).rejects.toThrow("no CSV");
  });

  it("rejects a CSV without the canton column", async () => {
    registerZip = buildRegisterZip("Ortschaftsname;PLZ4\nZürich;8001\n");
    mockFetch(mockEmptyResults);
    await expect(
      handlePost("list_postcodes_in_canton", { canton: "ZH" })
    ).rejects.toThrow("unexpected header");
  });

  it("refuses an archive that inflates past the size cap", () => {
    // A real zip bomb would take seconds to build; the guard is the same code
    // path with a small cap, so drive it directly.
    const zip = buildRegisterZip("A".repeat(64 * 1024));
    expect(() => readCsvFromZip(zip, 1024)).toThrow("decompression limit");
    expect(() => readCsvFromZip(zip)).not.toThrow();
  });

  it("two concurrent calls download the register once", async () => {
    const fetchMock = mockFetch(mockEmptyResults);
    await Promise.all([
      handlePost("list_postcodes_in_canton", { canton: "ZH" }),
      handlePost("list_postcodes_in_canton", { canton: "BE" }),
    ]);
    const downloads = fetchMock.mock.calls.filter((c) => String(c[0]).includes("data.geo.admin.ch"));
    expect(downloads).toHaveLength(1);
  });

  it("a later call reuses the cached register", async () => {
    const fetchMock = mockFetch(mockEmptyResults);
    await handlePost("list_postcodes_in_canton", { canton: "ZH" });
    await handlePost("list_postcodes_in_canton", { canton: "BE" });
    const downloads = fetchMock.mock.calls.filter((c) => String(c[0]).includes("data.geo.admin.ch"));
    expect(downloads).toHaveLength(1);
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
  it("still reports the canton when SearchServer returns no zipcode-origin entry", async () => {
    const emptySearchResponse = { results: [] };
    mockFetchSequence(mockPlzFindResponse, emptySearchResponse);
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.found).toBe(true);
    expect(result.coordinates).toBeNull();
    expect(result.canton.code).toBe("ZH");
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

// ── unknown tool ──────────────────────────────────────────────────────────────

describe("unknown post tool", () => {
  it("throws for unrecognized tool name", async () => {
    await expect(handlePost("does_not_exist", {})).rejects.toThrow(
      "Unknown post tool: does_not_exist"
    );
  });
});
