import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  handleRealEstate,
  realEstateTools,
  clearRealEstateCache,
} from "../../src/modules/realestate.js";
import {
  mockCkanSearchResults,
  mockCkanSearchResultsEmpty,
  mockCkanSearchResultsFallback,
  mockCkanSearchFailed,
  cpiStoreRows,
  mockImpiAssetList,
  mockImpiAssetListNoMaster,
  mockImpiData,
  mockImpiDataTruncated,
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
  const fetchMock = vi.fn().mockImplementation(() => {
    const payload = payloads[Math.min(call++, payloads.length - 1)];
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

/** The IMPI handler makes two calls: the asset listing, then the data file. */
function mockImpi() {
  return mockFetchSequence([mockImpiAssetList, mockImpiData]);
}

/** Serves `rows` the way the data.zg.ch rowstore does: _offset/_limit paging and a jahr filter. */
function mockCpiStore(rows = cpiStoreRows) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const u = new URL(String(url));
    const jahr = u.searchParams.get("jahr");
    const matching = jahr ? rows.filter((r) => r.jahr === jahr) : rows;
    const offset = Number(u.searchParams.get("_offset") ?? 0);
    const limit = Number(u.searchParams.get("_limit") ?? 20);
    const payload = {
      resultCount: matching.length,
      offset,
      limit,
      results: matching.slice(offset, offset + limit),
    };
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

beforeEach(() => {
  clearRealEstateCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearRealEstateCache();
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

describe("get_property_price_index — live BFS series", () => {
  it("fetches the current data file via the stable order number", async () => {
    const fetchMock = mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("dam-api.bfs.admin.ch");
    expect(urls[0]).toContain("orderNr=ds-x-05.06.03.01.02");
    expect(urls[1]).toBe("https://dam-api.bfs.admin.ch/hub/api/dam/assets/36753640/master");
    expect(result.data_url).toBe(urls[1]);
  });

  it("returns the published values, not a smoothed curve", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.series[0]).toEqual({ period: "2017-Q1", index: 90.4561 });
    expect(result.series).toContainEqual({ period: "2017-Q4", index: 93.2599 });
    expect(result.series).toContainEqual({ period: "2019-Q4", index: 100 });
    expect(result.series).toContainEqual({ period: "2020-Q1", index: 99.2443 });
  });

  it("series is not monotonic — quarters do fall", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    const values = (result.series as Array<{ index: number }>).map((s) => s.index);
    const drops = values.filter((v, i) => i > 0 && v < values[i - 1]);
    expect(drops.length).toBeGreaterThan(0);
  });

  it("houses and apartments are separate series, not an offset of the total", async () => {
    mockImpi();
    const all = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    const houses = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "houses" })
    );
    const apartments = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "apartments" })
    );
    const gaps = all.series.map(
      (s: { index: number }, i: number) => +(houses.series[i].index - s.index).toFixed(4)
    );
    expect(new Set(gaps).size).toBeGreaterThan(3);
    expect(houses.series[0].index).toBe(89.7446);
    expect(apartments.series[0].index).toBe(91.1885);
  });

  it("starts at 2017-Q1 — the series has no earlier quarters", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.from).toBe("2017-Q1");
    for (const s of result.series as Array<{ period: string }>) {
      expect(parseInt(s.period.slice(0, 4), 10)).toBeGreaterThanOrEqual(2017);
    }
  });

  it("names the source, the data file and the publication date", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.source).toContain("BFS");
    expect(result.source).toContain("IMPI");
    expect(result.data_as_of).toBe("30.07.2026");
    expect(result.source_url).toContain("bfs.admin.ch");
    expect(result.baseline).toBe("Q4 2019 = 100");
    expect(result.scope).toContain("Switzerland");
  });

  it("all three types are 100 in the Q4 2019 base quarter", async () => {
    for (const type of ["all", "houses", "apartments"]) {
      mockImpi();
      const result = JSON.parse(
        await handleRealEstate("get_property_price_index", { type, from: "2019Q4", to: "2019Q4" })
      );
      expect(result.series).toEqual([{ period: "2019-Q4", index: 100 }]);
    }
  });

  it("caches the series for the process", async () => {
    const fetchMock = mockImpi();
    await handleRealEstate("get_property_price_index", {});
    await handleRealEstate("get_property_price_index", { type: "houses" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("response is under 50K chars", async () => {
    mockImpi();
    const raw = await handleRealEstate("get_property_price_index", {});
    expect(raw.length).toBeLessThan(50000);
  });
});

// ── get_property_price_index — type filter ───────────────────────────────────

describe("get_property_price_index — type filter", () => {
  it("returns houses index when type=houses", async () => {
    mockImpi();
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "houses" })
    );
    expect(result.type).toBe("houses");
    const q4 = result.series.find((s: { period: string }) => s.period === "2019-Q4");
    expect(q4?.index).toBe(100);
  });

  it("returns apartments index when type=apartments", async () => {
    mockImpi();
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "apartments" })
    );
    expect(result.type).toBe("apartments");
    const q4 = result.series.find((s: { period: string }) => s.period === "2019-Q4");
    expect(q4?.index).toBe(100);
  });

  it("throws for invalid type", async () => {
    mockImpi();
    await expect(
      handleRealEstate("get_property_price_index", { type: "commercial" })
    ).rejects.toThrow("Invalid type");
  });
});

// ── get_property_price_index — from/to filtering ─────────────────────────────

describe("get_property_price_index — date range", () => {
  it("filters by from (year only)", async () => {
    mockImpi();
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2019" })
    );
    expect(result.from).toBe("2019-Q1");
    for (const s of result.series as Array<{ period: string }>) {
      expect(parseInt(s.period.slice(0, 4), 10)).toBeGreaterThanOrEqual(2019);
    }
  });

  it("filters by to (year only)", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", { to: "2019" }));
    for (const s of result.series as Array<{ period: string }>) {
      expect(parseInt(s.period.slice(0, 4), 10)).toBeLessThanOrEqual(2019);
    }
  });

  it("filters by from Q notation", async () => {
    mockImpi();
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2018Q2" })
    );
    expect(result.series[0].period).toBe("2018-Q2");
  });

  it("filters by to with dash notation", async () => {
    mockImpi();
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2020Q1", to: "2020-Q4" })
    );
    expect(result.series).toHaveLength(4);
    expect(result.from).toBe("2020-Q1");
    expect(result.to).toBe("2020-Q4");
  });

  it("throws for invalid from format", async () => {
    mockImpi();
    await expect(
      handleRealEstate("get_property_price_index", { from: "not-a-quarter" })
    ).rejects.toThrow("Invalid from value");
  });

  it("throws for invalid to format", async () => {
    mockImpi();
    await expect(
      handleRealEstate("get_property_price_index", { to: "bad-value" })
    ).rejects.toThrow("Invalid to value");
  });

  it("reports the covered period when the range is outside the series", async () => {
    mockImpi();
    await expect(
      handleRealEstate("get_property_price_index", { to: "2010" })
    ).rejects.toThrow("2017-Q1");
  });
});

// ── get_property_price_index — upstream failures ─────────────────────────────

describe("get_property_price_index — upstream failures", () => {
  it("errors with the BFS page when no data file is published", async () => {
    mockFetchSequence([mockImpiAssetListNoMaster]);
    await expect(handleRealEstate("get_property_price_index", {})).rejects.toThrow(
      "impi.html"
    );
  });

  it("rejects a data file whose series do not line up", async () => {
    mockFetchSequence([mockImpiAssetList, mockImpiDataTruncated]);
    await expect(handleRealEstate("get_property_price_index", {})).rejects.toThrow(
      "unexpected shape"
    );
  });

  it("does not cache a failed fetch", async () => {
    mockFetchSequence([mockImpiAssetListNoMaster]);
    await expect(handleRealEstate("get_property_price_index", {})).rejects.toThrow();
    const fetchMock = mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.series).toHaveLength(16);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ── get_property_price_index — trend ────────────────────────────────────────

describe("get_property_price_index — trend", () => {
  it("computes the year-on-year change from the published values", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    // 2020-Q4 103.1292 vs 2019-Q4 100
    expect(result.trend.change_yoy).toBe(3.13);
    expect(result.trend.change_yoy_label).toBe("2020-Q4 vs 2019-Q4");
  });

  it("trend is null when the prior year is outside the range", async () => {
    mockImpi();
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { from: "2017Q1", to: "2017Q1" })
    );
    expect(result.trend).toBeNull();
  });

  it("links the opendata.swiss dataset", async () => {
    mockImpi();
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.dataset_url).toContain("opendata.swiss");
    expect(result.dataset_url).toContain("wohnimmobilien");
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
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.index_name).toContain("Consumer Price Index");
    expect(result.baseline).toBe("Dezember 1982 = 100");
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.source).toContain("BFS");
  });

  it("each series point has year, month, index", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    for (const row of result.series) {
      expect(typeof row.year).toBe("number");
      expect(typeof row.month).toBe("string");
      expect(typeof row.index).toBe("number");
    }
  });

  it("has latest and data_points fields", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.latest).toBeDefined();
    expect(result.latest.index).toBeGreaterThan(0);
    expect(typeof result.data_points).toBe("number");
  });

  it("includes yoy_change_percent when 13+ months", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.yoy_change_percent).not.toBeNull();
    expect(typeof result.yoy_change_percent).toBe("number");
  });

  it("yoy_change is null for < 13 months", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", { limit: 6 }));
    expect(result.yoy_change_percent).toBeNull();
  });

  it("response is under 50K chars", async () => {
    mockCpiStore();
    const raw = await handleRealEstate("get_rent_index", {});
    expect(raw.length).toBeLessThan(50000);
  });

  it("has source_url and ckan_dataset fields", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.source_url).toContain("data.zg.ch");
    expect(result.ckan_dataset).toContain("opendata.swiss");
  });

  it("has note explaining relationship to property price index", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.note).toContain("get_property_price_index");
  });
});

// ── get_rent_index — window derived from the store ───────────────────────────

describe("get_rent_index — window", () => {
  it("ends on the store's last row, whatever the row count is", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    const last = cpiStoreRows[cpiStoreRows.length - 1];
    expect(result.latest.month).toBe(last.monat);
    expect(result.latest.year).toBe(Number(last.jahr));
  });

  it("follows the store when a month is appended", async () => {
    // A hard-coded offset drifts the moment the store grows; this is that month.
    const grown = [...cpiStoreRows, { jahr: "2025", monat: "November", index: "171.2" }];
    mockCpiStore(grown);
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.latest.month).toBe("November");
    expect(result.latest.year).toBe(2025);
    expect(result.coverage).toBe("Dezember 1982 – November 2025");
  });

  it("asks for the offset the store's row count implies", async () => {
    const fetchMock = mockCpiStore();
    await handleRealEstate("get_rent_index", { limit: 12 });
    const offsets = fetchMock.mock.calls
      .map((call) => new URL(String(call[0])))
      .filter((u) => u.searchParams.get("_limit") === "12")
      .map((u) => Number(u.searchParams.get("_offset")));
    expect(offsets).toEqual([cpiStoreRows.length - 12]);
  });

  it("reports the coverage the store actually has", async () => {
    mockCpiStore();
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.coverage).toBe("Dezember 1982 – Oktober 2025");
  });
});

// ── get_rent_index — year filter ─────────────────────────────────────────────

describe("get_rent_index — year filter", () => {
  it("filters to specific year", async () => {
    mockCpiStore();
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { year: 2020 })
    );
    for (const row of result.series) {
      expect(row.year).toBe(2020);
    }
  });

  it("returns 12 months for a full year", async () => {
    mockCpiStore();
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { year: 2020 })
    );
    expect(result.series).toHaveLength(12);
  });

  it("asks the store to filter rather than guessing an offset", async () => {
    const fetchMock = mockCpiStore();
    await handleRealEstate("get_rent_index", { year: 2022 });
    const yearCall = fetchMock.mock.calls
      .map((call) => new URL(String(call[0])))
      .find((u) => u.searchParams.has("jahr"));
    expect(yearCall?.searchParams.get("jahr")).toBe("2022");
    expect(yearCall?.searchParams.get("_offset")).toBeNull();
  });

  it("throws with the real coverage when the year has no data", async () => {
    mockCpiStore();
    await expect(
      handleRealEstate("get_rent_index", { year: 2030 })
    ).rejects.toThrow("No CPI data for year 2030. The series covers Dezember 1982 – Oktober 2025.");
  });
});

// ── get_rent_index — limit param ─────────────────────────────────────────────

describe("get_rent_index — limit", () => {
  it("respects limit param", async () => {
    mockCpiStore();
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { limit: 6 })
    );
    expect(result.series).toHaveLength(6);
  });

  it("clamps limit to 60 max", async () => {
    const fetchMock = mockCpiStore();
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { limit: 999 })
    );
    expect(result.series).toHaveLength(60);
    const limits = fetchMock.mock.calls
      .map((call) => new URL(String(call[0])).searchParams.get("_limit"));
    expect(limits).toContain("60");
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
  it("rejects a year the store does not cover", async () => {
    mockCpiStore();
    await expect(
      handleRealEstate("get_rent_index", { year: 2099 })
    ).rejects.toThrow("No CPI data for year 2099");
  });

  it("throws when the store is empty", async () => {
    mockCpiStore([]);
    await expect(handleRealEstate("get_rent_index", {})).rejects.toThrow("CPI series is empty");
  });
});

// ── get_property_price_index — Q-prefix notation ─────────────────────────────

describe("get_property_price_index — Q-prefix notation", () => {
  it("parses Q1 2020 format", async () => {
    mockImpi();
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
