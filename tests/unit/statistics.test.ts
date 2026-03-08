import { describe, it, expect, vi, afterEach } from "vitest";
import { handleStatistics, statisticsTools } from "../../src/modules/statistics.js";
import {
  mockPxWebSwitzerlandTotal,
  mockPxWebCantonZH,
  mockPxWebAllCantons,
  mockCkanSearchResults,
  mockCkanDatasetDetail,
  mockCkanNotFound,
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

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe("handleStatistics — unknown tool", () => {
  it("throws on unknown tool name", async () => {
    await expect(
      handleStatistics("nonexistent_tool", {})
    ).rejects.toThrow(/Unknown statistics tool/);
  });
});
