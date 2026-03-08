import { describe, it, expect, vi, afterEach } from "vitest";
import { handleStatistics, statisticsTools } from "../../src/modules/statistics.js";
import {
  mockPxWebSwitzerlandTotal,
  mockPxWebCantonZH,
  mockPxWebAllCantons,
  mockCkanSearchResults,
  mockCkanDatasetDetail,
  mockCkanNotFound,
  mockCkanSearchResultsLongDesc,
  mockCkanDatasetDetailSparse,
  mockCkanSearchResultsSparse,
} from "../fixtures/statistics.js";

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(payload),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tool definitions ─────────────────────────────────────────────────────────

describe("statisticsTools", () => {
  it("exports 3 tools", () => {
    expect(statisticsTools).toHaveLength(3);
  });

  it("has get_population tool", () => {
    const tool = statisticsTools.find((t) => t.name === "get_population");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.type).toBe("object");
  });

  it("has search_statistics tool with required query param", () => {
    const tool = statisticsTools.find((t) => t.name === "search_statistics");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain("query");
  });

  it("has get_statistic tool with required dataset_id param", () => {
    const tool = statisticsTools.find((t) => t.name === "get_statistic");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain("dataset_id");
  });
});

// ── get_population: Switzerland ──────────────────────────────────────────────

describe("get_population — Switzerland total", () => {
  it("returns population for Switzerland (no canton)", async () => {
    mockFetch(mockPxWebSwitzerlandTotal);
    const result = JSON.parse(await handleStatistics("get_population", {}));
    expect(result.location).toBe("Switzerland");
    expect(result.year).toBe(2024);
    expect(result.population).toBe(9051029);
    expect(result.source).toContain("BFS");
  });

  it("explicit 'switzerland' input works", async () => {
    mockFetch(mockPxWebSwitzerlandTotal);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "switzerland" })
    );
    expect(result.location).toBe("Switzerland");
    expect(result.population).toBe(9051029);
  });

  it("specific year is respected", async () => {
    mockFetch(mockPxWebSwitzerlandTotal);
    const result = JSON.parse(
      await handleStatistics("get_population", { year: 2020 })
    );
    expect(result.year).toBe(2020);
  });

  it("has source_url", async () => {
    mockFetch(mockPxWebSwitzerlandTotal);
    const result = JSON.parse(await handleStatistics("get_population", {}));
    expect(result.source_url).toContain("bfs.admin.ch");
  });

  it("invalid year throws error", async () => {
    await expect(
      handleStatistics("get_population", { year: 1999 })
    ).rejects.toThrow(/Year must be between/);
  });
});

// ── get_population: Single canton ────────────────────────────────────────────

describe("get_population — single canton", () => {
  it("returns population for ZH by code", async () => {
    mockFetch(mockPxWebCantonZH);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "ZH" })
    );
    expect(result.canton_code).toBe("ZH");
    expect(result.location).toBe("Zürich");
    expect(result.population).toBe(1620020);
    expect(result.year).toBe(2024);
  });

  it("returns population for ZH by lowercase code", async () => {
    mockFetch(mockPxWebCantonZH);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "zh" })
    );
    expect(result.canton_code).toBe("ZH");
    expect(result.population).toBe(1620020);
  });

  it("resolves 'Zurich' name alias", async () => {
    mockFetch(mockPxWebCantonZH);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "Zurich" })
    );
    expect(result.canton_code).toBe("ZH");
  });

  it("resolves 'Geneva' alias", async () => {
    const mockGE = {
      ...mockPxWebCantonZH,
      data: [{ key: ["2024", "GE", "1", "-99999", "-99999", "-99999"], values: ["519950"] }],
    };
    mockFetch(mockGE);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "Geneva" })
    );
    expect(result.canton_code).toBe("GE");
  });

  it("resolves 'Ticino' alias", async () => {
    const mockTI = {
      ...mockPxWebCantonZH,
      data: [{ key: ["2024", "TI", "1", "-99999", "-99999", "-99999"], values: ["360658"] }],
    };
    mockFetch(mockTI);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "Ticino" })
    );
    expect(result.canton_code).toBe("TI");
  });

  it("throws on unknown canton", async () => {
    await expect(
      handleStatistics("get_population", { canton: "Narnia" })
    ).rejects.toThrow(/Unknown canton/);
  });

  it("POST request is sent to BFS PxWeb endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockPxWebCantonZH),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleStatistics("get_population", { canton: "ZH" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("pxweb.bfs.admin.ch");
    expect(opts.method).toBe("POST");
  });
});

// ── get_population: All cantons ───────────────────────────────────────────────

describe("get_population — all cantons", () => {
  it("returns cantons array when canton=all", async () => {
    mockFetch(mockPxWebAllCantons);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    expect(result.switzerland_total).toBe(9051029);
    expect(Array.isArray(result.cantons)).toBe(true);
    expect(result.cantons.length).toBe(26);
  });

  it("cantons are sorted by population descending", async () => {
    mockFetch(mockPxWebAllCantons);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    const pops = result.cantons.map((c: { population: number }) => c.population);
    for (let i = 1; i < pops.length; i++) {
      expect(pops[i]).toBeLessThanOrEqual(pops[i - 1]);
    }
  });

  it("ZH is first (largest canton)", async () => {
    mockFetch(mockPxWebAllCantons);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    expect(result.cantons[0].code).toBe("ZH");
  });

  it("each canton has canton, code, population fields", async () => {
    mockFetch(mockPxWebAllCantons);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    for (const c of result.cantons) {
      expect(typeof c.canton).toBe("string");
      expect(c.canton.length).toBeGreaterThan(0);
      expect(typeof c.code).toBe("string");
      expect(c.code.length).toBe(2);
      expect(typeof c.population).toBe("number");
      expect(c.population).toBeGreaterThan(0);
    }
  });

  it("has year and source fields", async () => {
    mockFetch(mockPxWebAllCantons);
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    expect(result.year).toBe(2024);
    expect(result.source).toContain("BFS");
  });
});

// ── search_statistics ────────────────────────────────────────────────────────

describe("search_statistics", () => {
  it("returns results with id, title, description", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population" })
    );
    expect(result.query).toBe("population");
    expect(result.total_matches).toBe(42);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results[0].id).toBe("bevolkerungsstatistik-einwohner");
    expect(result.results[0].title).toContain("Population");
  });

  it("description is truncated to max 200 chars", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population" })
    );
    for (const r of result.results) {
      expect(r.description.length).toBeLessThanOrEqual(203); // 200 + "..."
    }
  });

  it("throws on missing query", async () => {
    await expect(
      handleStatistics("search_statistics", { query: "" })
    ).rejects.toThrow(/query is required/);
  });

  it("throws on missing query field", async () => {
    await expect(
      handleStatistics("search_statistics", {})
    ).rejects.toThrow(/query is required/);
  });

  it("uses ckan.opendata.swiss endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockCkanSearchResults),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleStatistics("search_statistics", { query: "population" });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("ckan.opendata.swiss");
    expect(url).toContain("package_search");
    expect(url).toContain("bundesamt-fur-statistik-bfs");
  });

  it("limit parameter caps results (default 10)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockCkanSearchResults),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleStatistics("search_statistics", { query: "population", limit: 5 });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("rows=5");
  });

  it("has source_url in response", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population" })
    );
    expect(result.source_url).toContain("opendata.swiss");
  });
});

// ── get_statistic ─────────────────────────────────────────────────────────────

describe("get_statistic", () => {
  it("returns dataset detail", async () => {
    mockFetch(mockCkanDatasetDetail);
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.id).toBe("bevolkerungsstatistik-einwohner");
    expect(result.title).toContain("Population");
    expect(result.organization).toContain("FSO");
  });

  it("returns resources array", async () => {
    mockFetch(mockCkanDatasetDetail);
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(Array.isArray(result.resources)).toBe(true);
    expect(result.resources.length).toBeGreaterThan(0);
    expect(result.resources[0].format).toBeDefined();
    expect(result.resources[0].url).toBeDefined();
  });

  it("contact has name and email", async () => {
    mockFetch(mockCkanDatasetDetail);
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.contact).toBeDefined();
    expect(result.contact.email).toBeDefined();
  });

  it("description is truncated to max 500 chars", async () => {
    mockFetch(mockCkanDatasetDetail);
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.description.length).toBeLessThanOrEqual(503);
  });

  it("has source_url pointing to dataset", async () => {
    mockFetch(mockCkanDatasetDetail);
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.source_url).toContain("opendata.swiss");
    expect(result.source_url).toContain("bevolkerungsstatistik-einwohner");
  });

  it("throws on missing dataset_id", async () => {
    await expect(
      handleStatistics("get_statistic", { dataset_id: "" })
    ).rejects.toThrow(/dataset_id is required/);
  });

  it("throws on failed API response", async () => {
    mockFetch(mockCkanNotFound, 404);
    await expect(
      handleStatistics("get_statistic", { dataset_id: "nonexistent" })
    ).rejects.toThrow(/HTTP 404/);
  });
});

// ── search/get_statistic: data.success === false branches ─────────────────────

describe("search_statistics — data.success false (line 312)", () => {
  it("throws when CKAN returns success:false for search", async () => {
    mockFetch({ success: false, error: { message: "Rate limit exceeded" } });
    await expect(
      handleStatistics("search_statistics", { query: "population" })
    ).rejects.toThrow("opendata.swiss search failed");
  });
});

describe("get_statistic — data.success false (line 339)", () => {
  it("throws when CKAN returns success:false for package_show", async () => {
    mockFetch({ success: false, error: { message: "Not found" } });
    await expect(
      handleStatistics("get_statistic", { dataset_id: "missing-dataset" })
    ).rejects.toThrow("Dataset not found: missing-dataset");
  });
});

// ── get_population: empty data (null pop branch) ─────────────────────────────

describe("get_population — empty data returns null population", () => {
  it("returns null population when data array is empty for switzerland mode", async () => {
    mockFetch({ ...mockPxWebSwitzerlandTotal, data: [] });
    const result = JSON.parse(
      await handleStatistics("get_population", { location: "switzerland" })
    );
    expect(result.population).toBeNull();
  });

  it("returns null population when data array is empty for canton mode", async () => {
    mockFetch({ ...mockPxWebCantonZH, data: [] });
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "ZH" })
    );
    expect(result.population).toBeNull();
    expect(result.canton_code).toBe("ZH");
  });
});

// ── get_population: unknown canton code fallback ──────────────────────────────

describe("get_population — unknown canton code in CANTON_NAMES", () => {
  it("falls back to raw canton code when not in CANTON_NAMES map (line 278)", async () => {
    // Minimal all-mode response: one Switzerland total + one unknown canton code
    const withUnknownCode = {
      columns: mockPxWebAllCantons.columns,
      comments: [],
      metadata: [],
      data: [
        { key: ["2024", "8100", "1", "-99999", "-99999", "-99999"], values: ["9051029"] },
        { key: ["2024", "9999", "1", "-99999", "-99999", "-99999"], values: ["12345"] },
      ],
    };
    mockFetch(withUnknownCode);
    // Must use canton: "all" (not location: "all") — arg name is 'canton'
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    const cantonList: Array<{ canton: string; code: string; population: number }> = result.cantons;
    const unknownEntry = cantonList?.find((c) => c.code === "9999");
    // Unknown code → CANTON_NAMES fallback returns the raw code
    expect(unknownEntry?.canton).toBe("9999");
  });
});

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe("handleStatistics — unknown tool", () => {
  it("throws on unknown tool name", async () => {
    await expect(
      handleStatistics("nonexistent_tool", {})
    ).rejects.toThrow(/Unknown statistics tool/);
  });
});

// ── truncate branch: long description ────────────────────────────────────────

describe("search_statistics — truncates long descriptions", () => {
  it("truncates description longer than 200 chars with ellipsis", async () => {
    mockFetch(mockCkanSearchResultsLongDesc);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population" })
    );
    expect(result.results).toHaveLength(1);
    const desc: string = result.results[0].description;
    // truncate(str, 200): output is exactly 200 chars ending in "..."
    expect(desc.length).toBeLessThanOrEqual(200);
    expect(desc.endsWith("...")).toBe(true);
  });
});

// ── resolveCantonCode: edge cases ─────────────────────────────────────────────

describe("get_population — resolveCantonCode edge cases", () => {
  it("resolves already-uppercase 2-letter canton code (line 104)", async () => {
    mockFetch(mockPxWebCantonZH);
    // "ZH" is not in CANTON_CODES (lowercase key map) but IS in CANTON_NAMES
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "ZH" })
    );
    expect(result.canton_code).toBe("ZH");
  });

  it("resolves canton via partial alias match (line 109)", async () => {
    mockFetch(mockPxWebCantonZH);
    // "zurich city" contains "zurich" which is an alias for ZH
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "zurich city" })
    );
    expect(result.canton_code).toBe("ZH");
  });
});

// ── resolveText: language fallback chain ──────────────────────────────────────

describe("resolveText — language fallback chain", () => {
  it("falls back through FR when EN and DE are absent", async () => {
    // Need a fixture where title/notes only has FR text
    const frOnlyResponse = {
      success: true,
      result: {
        count: 1,
        results: [
          {
            id: "fr1",
            name: "fr-dataset",
            title: { fr: "Données en français" }, // no EN or DE
            notes: { fr: "Description en français." },
            keywords: { fr: ["données"] },
            metadata_modified: "2025-01-01T00:00:00",
            resources: [],
            contact_points: [],
          },
        ],
      },
    };
    mockFetch(frOnlyResponse);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "données" })
    );
    expect(result.results[0].title).toBe("Données en français");
  });

  it("falls back to Object.values(val)[0] when only an unusual language key exists", async () => {
    const rmResponse = {
      success: true,
      result: {
        count: 1,
        results: [
          {
            id: "rm1",
            name: "rm-dataset",
            title: { rm: "Datas en rumantsch" }, // Romansh only — not en/de/fr/it
            notes: { rm: "Descripziun en rumantsch." },
            keywords: {},
            metadata_modified: "2025-01-01T00:00:00",
            resources: [],
            contact_points: [],
          },
        ],
      },
    };
    mockFetch(rmResponse);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "rumantsch" })
    );
    expect(result.results[0].title).toBe("Datas en rumantsch");
  });

  it("returns plain string title as-is (resolveText string branch)", async () => {
    const plainStringResponse = {
      success: true,
      result: {
        count: 1,
        results: [
          {
            id: "plain1",
            name: "plain-string-dataset",
            title: "Plain String Title", // direct string, not an object
            notes: "Plain string notes.",
            keywords: { en: ["test"] },
            metadata_modified: "2025-01-01T00:00:00",
            resources: [],
            contact_points: [],
          },
        ],
      },
    };
    mockFetch(plainStringResponse);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "plain" })
    );
    expect(result.results[0].title).toBe("Plain String Title");
    expect(result.results[0].description).toBe("Plain string notes.");
  });

  it("returns empty string when resolveText receives empty object (all branches falsy)", async () => {
    const emptyObjResponse = {
      success: true,
      result: {
        count: 1,
        results: [
          {
            id: "empty1",
            name: "empty-obj-dataset",
            title: {}, // empty object — Object.values(val)[0] is undefined → falls back to ""
            notes: {},
            keywords: { en: ["test"] },
            metadata_modified: "2025-01-01T00:00:00",
            resources: [],
            contact_points: [],
          },
        ],
      },
    };
    mockFetch(emptyObjResponse);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "empty" })
    );
    expect(result.results[0].title).toBe("");
    expect(result.results[0].description).toBe("");
  });
});

// ── search_statistics: non-string query arg fallback ─────────────────────────

describe("search_statistics — non-string query", () => {
  it("throws when query arg is not a string (undefined → empty string → error)", async () => {
    await expect(
      handleStatistics("search_statistics", { query: undefined })
    ).rejects.toThrow("query is required");
  });
});

// ── get_statistic: non-string dataset_id fallback ─────────────────────────────

describe("get_statistic — non-string dataset_id", () => {
  it("throws when dataset_id is not a string (number → empty string → error)", async () => {
    await expect(
      handleStatistics("get_statistic", { dataset_id: 42 })
    ).rejects.toThrow("dataset_id is required");
  });
});

// ── search_statistics: sparse fields (no metadata_modified, description fallback) ──

describe("search_statistics — sparse optional fields", () => {
  it("handles missing metadata_modified, description fallback, and no-keywords fallback", async () => {
    mockFetch(mockCkanSearchResultsSparse);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "sparse" })
    );
    expect(result.results).toHaveLength(2);
    // First result: notes is null → description field used; metadata_modified absent → ""
    expect(typeof result.results[0].description).toBe("string");
    expect(result.results[0].modified).toBe("");
    expect(result.results[0].keywords).toContain("test");
    // Second result: keywords completely absent → []
    expect(result.results[1].keywords).toEqual([]);
  });
});

// ── get_statistic: sparse optional fields coverage ───────────────────────────

describe("get_statistic — sparse optional fields", () => {
  it("handles missing keywords, issued, contact, organization, resources", async () => {
    mockFetch(mockCkanDatasetDetailSparse);
    const result = JSON.parse(
      await handleStatistics("get_statistic", { dataset_id: "sparse-dataset" })
    );
    // keywords completely absent → falls back to []
    expect(Array.isArray(result.keywords)).toBe(true);
    expect(result.keywords).toHaveLength(0);
    // issued is empty string when missing
    expect(result.issued).toBe("");
    // metadata_modified missing → modified = ""
    expect(result.modified).toBe("");
    // contact is undefined (not in JSON output)
    expect(result.contact).toBeUndefined();
    // organization is empty string when missing
    expect(result.organization).toBe("");
    // resources absent → empty array
    expect(result.resources).toHaveLength(0);
  });
});

// ── search_statistics: DE-only keywords fallback ─────────────────────────────

describe("search_statistics — DE-only keywords", () => {
  it("falls back to DE keywords when EN is absent", async () => {
    const deOnlyKeywordsResponse = {
      success: true,
      result: {
        count: 1,
        results: [
          {
            id: "de-only",
            name: "de-only-dataset",
            title: { de: "Deutscher Titel" },
            notes: { de: "Kurze Beschreibung." },
            keywords: { de: ["bevölkerung", "gemeinde"] }, // no 'en'
            metadata_modified: "2025-01-01T00:00:00",
            resources: [],
            contact_points: [],
          },
        ],
      },
    };
    mockFetch(deOnlyKeywordsResponse);
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "bevölkerung" })
    );
    expect(result.results[0].keywords).toContain("bevölkerung");
  });
});
