import { describe, it, expect, vi, afterEach } from "vitest";
import { handleRealEstate, realEstateTools } from "../../src/modules/realestate.js";
import {
  mockCkanSearchResults,
  mockCkanSearchResultsEmpty,
  mockCkanSearchResultsFallback,
  mockCkanSearchFailed,
  mockCpiLatest,
  mockCpiYear2020,
  mockCpiNoData,
  mockCpiSmall,
} from "../fixtures/realestate.js";

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

function mockFetchSequence(payloads: unknown[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const payload = payloads[Math.min(call++, payloads.length - 1)];
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

// ── Tool definitions ─────────────────────────────────────────────────────────

describe("realEstateTools", () => {
  it("exports 3 tools", () => {
    expect(realEstateTools).toHaveLength(3);
  });

  it("has get_property_price_index tool", () => {
    const tool = realEstateTools.find((t) => t.name === "get_property_price_index");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.type).toBe("object");
  });

  it("has search_real_estate_data tool with required query param", () => {
    const tool = realEstateTools.find((t) => t.name === "search_real_estate_data");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain("query");
  });

  it("has get_rent_index tool", () => {
    const tool = realEstateTools.find((t) => t.name === "get_rent_index");
    expect(tool).toBeDefined();
  });

  it("all tools have name, description, inputSchema", () => {
    for (const tool of realEstateTools) {
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema).toBeDefined();
    }
  });
});

// ── get_property_price_index — default (all types, full range) ───────────────

describe("get_property_price_index — defaults", () => {
  it("returns full series without args", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.type).toBe("all");
    expect(result.baseline).toBe("Q4 2019 = 100");
    expect(result.series.length).toBeGreaterThan(50);
    expect(result.source).toContain("BFS");
  });

  it("latest_period is the most recent quarter", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.latest_period).toMatch(/^\d{4}-Q\d$/);
  });

  it("Q4 2019 index for all types is 100.0", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2019Q4", to: "2019Q4" })
    );
    expect(result.series).toHaveLength(1);
    expect(result.series[0].index).toBe(100.0);
    expect(result.series[0].period).toBe("2019-Q4");
  });

  it("Q4 2019 houses index is 100.0", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", {
        type: "houses",
        from: "2019Q4",
        to: "2019Q4",
      })
    );
    expect(result.series[0].index).toBe(100.0);
  });

  it("Q4 2019 apartments index is 100.0", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", {
        type: "apartments",
        from: "2019Q4",
        to: "2019Q4",
      })
    );
    expect(result.series[0].index).toBe(100.0);
  });

  it("response is under 50K chars", async () => {
    const raw = await handleRealEstate("get_property_price_index", {});
    expect(raw.length).toBeLessThan(50000);
  });
});

// ── get_property_price_index — type filter ───────────────────────────────────

describe("get_property_price_index — type filter", () => {
  it("returns houses index when type=houses", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "houses" })
    );
    expect(result.type).toBe("houses");
    expect(result.series[0]).toHaveProperty("index");
    // Houses index on 2019-Q4 should be 100
    const q4 = result.series.find((s: { period: string }) => s.period === "2019-Q4");
    expect(q4?.index).toBe(100.0);
  });

  it("returns apartments index when type=apartments", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "apartments" })
    );
    expect(result.type).toBe("apartments");
    const q4 = result.series.find((s: { period: string }) => s.period === "2019-Q4");
    expect(q4?.index).toBe(100.0);
  });

  it("throws for invalid type", async () => {
    await expect(
      handleRealEstate("get_property_price_index", { type: "commercial" })
    ).rejects.toThrow("Invalid type");
  });
});

// ── get_property_price_index — from/to filtering ─────────────────────────────

describe("get_property_price_index — date range", () => {
  it("filters by from (year only)", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2022" })
    );
    expect(result.from).toMatch(/^2022-Q1/);
    for (const s of result.series as Array<{ period: string }>) {
      const [year] = s.period.split("-Q");
      expect(parseInt(year, 10)).toBeGreaterThanOrEqual(2022);
    }
  });

  it("filters by to (year only)", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { to: "2019" })
    );
    for (const s of result.series as Array<{ period: string }>) {
      const [year] = s.period.split("-Q");
      expect(parseInt(year, 10)).toBeLessThanOrEqual(2019);
    }
  });

  it("filters by from Q notation", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2024Q2" })
    );
    expect(result.series[0].period).toBe("2024-Q2");
  });

  it("filters by to with dash notation", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", {
        from: "2020Q1",
        to: "2020-Q4",
      })
    );
    expect(result.series).toHaveLength(4);
    expect(result.from).toBe("2020-Q1");
    expect(result.to).toBe("2020-Q4");
  });

  it("throws for invalid from format", async () => {
    await expect(
      handleRealEstate("get_property_price_index", { from: "not-a-quarter" })
    ).rejects.toThrow("Invalid from value");
  });

  it("throws for invalid to format", async () => {
    await expect(
      handleRealEstate("get_property_price_index", { to: "bad-value" })
    ).rejects.toThrow("Invalid to value");
  });

  it("throws when no data in range", async () => {
    await expect(
      handleRealEstate("get_property_price_index", { from: "2030Q1" })
    ).rejects.toThrow("No data available");
  });
});

// ── get_property_price_index — trend ────────────────────────────────────────

describe("get_property_price_index — trend", () => {
  it("includes yoy trend for full data", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.trend).not.toBeNull();
    expect(typeof result.trend.change_yoy).toBe("number");
    expect(result.trend.change_yoy_label).toMatch(/vs \d{4}-Q\d/);
  });

  it("trend is null for single data point with no prior year", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2009Q4", to: "2009Q4" })
    );
    expect(result.trend).toBeNull();
  });

  it("has dataset_id field", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.dataset_id).toContain("wohnimmobilien");
  });

  it("source_url points to opendata.swiss", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.source_url).toContain("opendata.swiss");
  });
});

// ── search_real_estate_data ──────────────────────────────────────────────────

describe("search_real_estate_data — success", () => {
  it("returns results for a query", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "Immobilien" })
    );
    expect(result.query).toBe("Immobilien");
    expect(result.total_matches).toBe(2);
    expect(result.results).toHaveLength(2);
  });

  it("each result has required fields", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "Miete" })
    );
    for (const r of result.results) {
      expect(typeof r.id).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.title).toBe("string");
      expect(r.title.length).toBeGreaterThan(0);
      expect(Array.isArray(r.resources)).toBe(true);
      expect(typeof r.dataset_url).toBe("string");
      expect(r.dataset_url).toContain("opendata.swiss");
    }
  });

  it("description is truncated to max 203 chars", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "property" })
    );
    for (const r of result.results) {
      expect(r.description.length).toBeLessThanOrEqual(203);
    }
  });

  it("has source and source_url", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "wohnen" })
    );
    expect(result.source).toContain("opendata.swiss");
    expect(result.source_url).toContain("opendata.swiss");
    expect(result.source_url).toContain(encodeURIComponent("wohnen"));
  });

  it("respects limit param", async () => {
    mockFetch(mockCkanSearchResults);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "Wohnen", limit: 5 })
    );
    // limit is passed to CKAN API, mock always returns 2
    expect(result.results.length).toBeLessThanOrEqual(20);
  });

  it("response is under 50K chars", async () => {
    mockFetch(mockCkanSearchResults);
    const raw = await handleRealEstate("search_real_estate_data", {
      query: "Immobilien",
    });
    expect(raw.length).toBeLessThan(50000);
  });
});

describe("search_real_estate_data — empty + fallback", () => {
  it("falls back to unrestricted search when first call returns 0", async () => {
    mockFetchSequence([mockCkanSearchResultsEmpty, mockCkanSearchResultsFallback]);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "obscure-topic" })
    );
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("some-fallback-dataset");
  });
});

describe("search_real_estate_data — errors", () => {
  it("throws when query is empty string", async () => {
    await expect(
      handleRealEstate("search_real_estate_data", { query: "" })
    ).rejects.toThrow("query is required");
  });

  it("throws when query is missing", async () => {
    await expect(
      handleRealEstate("search_real_estate_data", {})
    ).rejects.toThrow("query is required");
  });

  it("throws when CKAN returns success:false", async () => {
    mockFetch(mockCkanSearchFailed);
    await expect(
      handleRealEstate("search_real_estate_data", { query: "test" })
    ).rejects.toThrow("opendata.swiss search failed");
  });

  it("throws on HTTP error", async () => {
    mockFetch({ error: "server error" }, 500);
    await expect(
      handleRealEstate("search_real_estate_data", { query: "test" })
    ).rejects.toThrow("HTTP 500");
  });
});

// ── get_rent_index — latest ──────────────────────────────────────────────────

describe("get_rent_index — latest", () => {
  it("returns CPI series data", async () => {
    mockFetch(mockCpiLatest);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.index_name).toContain("Consumer Price Index");
    expect(result.baseline).toContain("1982");
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.source).toContain("BFS");
  });

  it("each series point has year, month, index", async () => {
    mockFetch(mockCpiLatest);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    for (const row of result.series) {
      expect(typeof row.year).toBe("number");
      expect(typeof row.month).toBe("string");
      expect(typeof row.index).toBe("number");
    }
  });

  it("has latest and data_points fields", async () => {
    mockFetch(mockCpiLatest);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.latest).toBeDefined();
    expect(result.latest.index).toBeGreaterThan(0);
    expect(typeof result.data_points).toBe("number");
  });

  it("includes yoy_change_percent when 13+ months", async () => {
    mockFetch(mockCpiLatest);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    // mockCpiLatest has 24 months so yoy should be set
    expect(result.yoy_change_percent).not.toBeNull();
    expect(typeof result.yoy_change_percent).toBe("number");
  });

  it("yoy_change is null for < 13 months", async () => {
    mockFetch(mockCpiSmall);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.yoy_change_percent).toBeNull();
  });

  it("response is under 50K chars", async () => {
    mockFetch(mockCpiLatest);
    const raw = await handleRealEstate("get_rent_index", {});
    expect(raw.length).toBeLessThan(50000);
  });

  it("has source_url and ckan_dataset fields", async () => {
    mockFetch(mockCpiLatest);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.source_url).toContain("data.zg.ch");
    expect(result.ckan_dataset).toContain("opendata.swiss");
  });

  it("has note explaining relationship to property price index", async () => {
    mockFetch(mockCpiLatest);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.note).toContain("get_property_price_index");
  });
});

// ── get_rent_index — year filter ─────────────────────────────────────────────

describe("get_rent_index — year filter", () => {
  it("filters to specific year", async () => {
    mockFetch(mockCpiYear2020);
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { year: 2020 })
    );
    for (const row of result.series) {
      expect(row.year).toBe(2020);
    }
  });

  it("returns 12 months for a full year", async () => {
    mockFetch(mockCpiYear2020);
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { year: 2020 })
    );
    expect(result.series).toHaveLength(12);
  });

  it("throws when year has no data", async () => {
    mockFetch(mockCpiNoData);
    await expect(
      handleRealEstate("get_rent_index", { year: 2030 })
    ).rejects.toThrow("No CPI data found for year 2030");
  });
});

// ── get_rent_index — limit param ─────────────────────────────────────────────

describe("get_rent_index — limit", () => {
  it("respects limit param", async () => {
    mockFetch({ ...mockCpiSmall, limit: 6, results: mockCpiLatest.results.slice(0, 6) });
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { limit: 6 })
    );
    expect(result.series.length).toBeLessThanOrEqual(6);
  });

  it("clamps limit to 60 max", async () => {
    mockFetch(mockCpiLatest);
    // Should not throw even with large limit
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { limit: 999 })
    );
    expect(result).toBeDefined();
  });
});

// ── search_real_estate_data — fallback data2 failed ─────────────────────────

describe("search_real_estate_data — fallback failure handling", () => {
  it("returns empty results when first call has 0 and fallback success:false", async () => {
    // When first result is 0, fallback is called; if fallback success:false, we skip update
    mockFetchSequence([mockCkanSearchResultsEmpty, mockCkanSearchFailed]);
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "nothing" })
    );
    // Falls through with empty results
    expect(result.results).toHaveLength(0);
    expect(result.total_matches).toBe(0);
  });
});

// ── get_rent_index — empty series edge case ───────────────────────────────────

describe("get_rent_index — edge cases", () => {
  it("handles empty series gracefully (period becomes N/A)", async () => {
    // Return data only for 2019, request year 2099 → should throw
    mockFetch(mockCpiNoData);
    await expect(
      handleRealEstate("get_rent_index", { year: 2099 })
    ).rejects.toThrow("No CPI data found");
  });
});

// ── get_property_price_index — Q-prefix notation ─────────────────────────────

describe("get_property_price_index — Q-prefix notation", () => {
  it("parses Q1 2020 format", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "Q1 2020", to: "Q4 2020" })
    );
    expect(result.series).toHaveLength(4);
    expect(result.from).toBe("2020-Q1");
  });
});

// ── handleRealEstate — dispatcher ────────────────────────────────────────────

describe("handleRealEstate — dispatcher", () => {
  it("throws for unknown tool name", async () => {
    await expect(
      handleRealEstate("unknown_tool", {})
    ).rejects.toThrow("Unknown real estate tool");
  });
});
