// Integration tests — hit real opendata.swiss and data.zg.ch APIs
// Run with: npx vitest run tests/integration/realestate.integration.test.ts

import { describe, it, expect } from "vitest";
import { handleRealEstate } from "../../src/modules/realestate.js";

// ── get_property_price_index — full dataset ──────────────────────────────────

describe("get_property_price_index — live (embedded BFS data)", () => {
  it("returns index data for all types", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.type).toBe("all");
    expect(result.baseline).toBe("Q4 2019 = 100");
    expect(result.series.length).toBeGreaterThan(40);
    expect(result.source).toContain("BFS");
  }, 10000);

  it("Q4 2019 baseline is exactly 100", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", {
        from: "2019Q4",
        to: "2019Q4",
      })
    );
    expect(result.series[0].index).toBe(100.0);
    expect(result.series[0].period).toBe("2019-Q4");
  }, 10000);

  it("response is under 50K chars", async () => {
    const raw = await handleRealEstate("get_property_price_index", {});
    expect(raw.length).toBeLessThan(50000);
  }, 10000);

  it("latest index is above 100 (prices rose after 2019)", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.latest_index).toBeGreaterThan(100);
  }, 10000);

  it("houses index is available", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "houses" })
    );
    expect(result.type).toBe("houses");
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.latest_index).toBeGreaterThan(100);
  }, 10000);

  it("apartments index is available", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", { type: "apartments" })
    );
    expect(result.type).toBe("apartments");
    expect(result.series.length).toBeGreaterThan(0);
  }, 10000);

  it("date range filter returns correct window", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_property_price_index", {
        from: "2021Q1",
        to: "2021Q4",
      })
    );
    expect(result.series).toHaveLength(4);
    expect(result.from).toBe("2021-Q1");
    expect(result.to).toBe("2021-Q4");
  }, 10000);

  it("includes trend with year-over-year change", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.trend).not.toBeNull();
    expect(typeof result.trend.change_yoy).toBe("number");
  }, 10000);

  it("has dataset_id and source_url fields", async () => {
    const result = JSON.parse(await handleRealEstate("get_property_price_index", {}));
    expect(result.dataset_id).toContain("wohnimmobilien");
    expect(result.source_url).toContain("opendata.swiss");
  }, 10000);
});

// ── search_real_estate_data — live (opendata.swiss) ──────────────────────────

describe("search_real_estate_data — live (opendata.swiss CKAN)", () => {
  it("returns results for 'Immobilien' query", async () => {
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "Immobilien" })
    );
    expect(result.query).toBe("Immobilien");
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.total_matches).toBeGreaterThanOrEqual(0);
  }, 30000);

  it("response is under 50K chars for Miete query", async () => {
    const raw = await handleRealEstate("search_real_estate_data", { query: "Miete" });
    expect(raw.length).toBeLessThan(50000);
  }, 30000);

  it("each result has id, title, dataset_url", async () => {
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "wohnen" })
    );
    for (const r of result.results) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.title).toBe("string");
      expect(r.dataset_url).toContain("opendata.swiss");
    }
  }, 30000);

  it("descriptions are truncated (max 203 chars)", async () => {
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "Immobilien" })
    );
    for (const r of result.results) {
      expect(r.description.length).toBeLessThanOrEqual(203);
    }
  }, 30000);

  it("has source_url with encoded query", async () => {
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "Wohnungsbau" })
    );
    expect(result.source_url).toContain("opendata.swiss");
    expect(result.source_url).toContain("Wohnungsbau");
  }, 30000);

  it("respects limit param", async () => {
    const result = JSON.parse(
      await handleRealEstate("search_real_estate_data", { query: "wohnen", limit: 3 })
    );
    expect(result.results.length).toBeLessThanOrEqual(3);
  }, 30000);
});

// ── get_rent_index — live (data.zg.ch) ──────────────────────────────────────

describe("get_rent_index — live (Swiss CPI via data.zg.ch)", () => {
  it("returns CPI series for latest 24 months", async () => {
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.index_name).toContain("Consumer Price Index");
    expect(result.baseline).toContain("1982");
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.source).toContain("BFS");
  }, 30000);

  it("response is under 50K chars", async () => {
    const raw = await handleRealEstate("get_rent_index", {});
    expect(raw.length).toBeLessThan(50000);
  }, 30000);

  it("latest index is above 150 (prices roughly 1.5x since 1982)", async () => {
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.latest.index).toBeGreaterThan(150);
    expect(result.latest.index).toBeLessThan(250);
  }, 30000);

  it("each series point has year, month, index", async () => {
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    for (const row of result.series) {
      expect(typeof row.year).toBe("number");
      expect(row.year).toBeGreaterThan(1982);
      expect(typeof row.month).toBe("string");
      expect(typeof row.index).toBe("number");
      expect(row.index).toBeGreaterThan(90);
    }
  }, 30000);

  it("has ckan_dataset field pointing to opendata.swiss", async () => {
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.ckan_dataset).toContain("opendata.swiss");
  }, 30000);

  it("year filter returns data for that year only", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { year: 2022 })
    );
    for (const row of result.series) {
      expect(row.year).toBe(2022);
    }
    expect(result.series.length).toBeLessThanOrEqual(12);
  }, 30000);

  it("limit param works", async () => {
    const result = JSON.parse(
      await handleRealEstate("get_rent_index", { limit: 6 })
    );
    expect(result.series.length).toBeLessThanOrEqual(6);
  }, 30000);

  it("note mentions get_property_price_index", async () => {
    const result = JSON.parse(await handleRealEstate("get_rent_index", {}));
    expect(result.note).toContain("get_property_price_index");
  }, 30000);
});
