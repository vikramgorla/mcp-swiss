// Integration tests — hit real BFS and opendata.swiss APIs
// Run with: npx vitest run tests/integration/statistics.integration.test.ts

import { describe, it, expect } from "vitest";
import { handleStatistics } from "../../src/modules/statistics.js";

// ── get_population: Switzerland ──────────────────────────────────────────────

describe("get_population — live (BFS PxWeb)", () => {
  it("returns Switzerland total population for latest year", async () => {
    const raw = await handleStatistics("get_population", {});
    const result = JSON.parse(raw);
    expect(result.location).toBe("Switzerland");
    expect(result.year).toBe(2024);
    expect(result.population).toBeGreaterThan(8_000_000);
    expect(result.population).toBeLessThan(12_000_000);
    expect(result.source).toContain("BFS");
    expect(result.source_url).toContain("bfs.admin.ch");
  }, 60000);

  it("response is under 50K chars", async () => {
    const raw = await handleStatistics("get_population", {});
    expect(raw.length).toBeLessThan(50000);
  }, 60000);

  it("population_type is permanent resident", async () => {
    const result = JSON.parse(await handleStatistics("get_population", {}));
    expect(result.population_type).toContain("Permanent");
  }, 60000);

  it("returns valid data for year 2020", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { year: 2020 })
    );
    expect(result.year).toBe(2020);
    expect(result.population).toBeGreaterThan(8_000_000);
  }, 60000);
});

// ── get_population: Cantons ──────────────────────────────────────────────────

describe("get_population — canton (live)", () => {
  it("returns Zürich population", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "ZH" })
    );
    expect(result.canton_code).toBe("ZH");
    expect(result.location).toBe("Zürich");
    expect(result.population).toBeGreaterThan(1_000_000);
    expect(result.population).toBeLessThan(2_500_000);
  }, 60000);

  it("response for single canton is under 50K chars", async () => {
    const raw = await handleStatistics("get_population", { canton: "BE" });
    expect(raw.length).toBeLessThan(50000);
  }, 60000);

  it("resolves Geneva by name", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "Geneva" })
    );
    expect(result.canton_code).toBe("GE");
    expect(result.population).toBeGreaterThan(400_000);
  }, 60000);

  it("resolves Ticino by name", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "Ticino" })
    );
    expect(result.canton_code).toBe("TI");
    expect(result.population).toBeGreaterThan(300_000);
  }, 60000);

  it("resolves Bern by name", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "Bern" })
    );
    expect(result.canton_code).toBe("BE");
    expect(result.population).toBeGreaterThan(900_000);
  }, 60000);

  it("smallest canton (AI) has reasonable population", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "AI" })
    );
    expect(result.canton_code).toBe("AI");
    expect(result.population).toBeGreaterThan(5_000);
    expect(result.population).toBeLessThan(100_000);
  }, 60000);
});

// ── get_population: All cantons ───────────────────────────────────────────────

describe("get_population — all cantons (live)", () => {
  it("returns 26 cantons + Switzerland total", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    expect(result.cantons).toHaveLength(26);
    expect(result.switzerland_total).toBeGreaterThan(8_000_000);
  }, 90000);

  it("all-cantons response is under 50K chars", async () => {
    const raw = await handleStatistics("get_population", { canton: "all" });
    expect(raw.length).toBeLessThan(50000);
  }, 90000);

  it("canton populations sum to roughly Switzerland total", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    const sum = result.cantons.reduce(
      (acc: number, c: { population: number }) => acc + c.population,
      0
    );
    // Should be within 5% of the total
    const ratio = sum / result.switzerland_total;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  }, 90000);

  it("ZH has the largest population", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    expect(result.cantons[0].code).toBe("ZH");
  }, 90000);

  it("each canton has valid code and name", async () => {
    const result = JSON.parse(
      await handleStatistics("get_population", { canton: "all" })
    );
    for (const c of result.cantons) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.canton).toBeTruthy();
      expect(c.population).toBeGreaterThan(0);
    }
  }, 90000);
});

// ── search_statistics ─────────────────────────────────────────────────────────

describe("search_statistics — live (opendata.swiss)", () => {
  it("returns results for 'population' query", async () => {
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population" })
    );
    expect(result.query).toBe("population");
    expect(result.total_matches).toBeGreaterThan(0);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  }, 20000);

  it("response is under 50K chars", async () => {
    const raw = await handleStatistics("search_statistics", { query: "GDP Switzerland" });
    expect(raw.length).toBeLessThan(50000);
  }, 20000);

  it("each result has id, title, description", async () => {
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "housing" })
    );
    for (const r of result.results) {
      expect(typeof r.id).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.title).toBe("string");
      expect(r.title.length).toBeGreaterThan(0);
    }
  }, 20000);

  it("limits results with limit param", async () => {
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population", limit: 3 })
    );
    expect(result.results.length).toBeLessThanOrEqual(3);
  }, 20000);

  it("descriptions are truncated (max 203 chars with ellipsis)", async () => {
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "population" })
    );
    for (const r of result.results) {
      expect(r.description.length).toBeLessThanOrEqual(203);
    }
  }, 20000);

  it("has source and source_url", async () => {
    const result = JSON.parse(
      await handleStatistics("search_statistics", { query: "unemployment" })
    );
    expect(result.source).toBeTruthy();
    expect(result.source_url).toContain("opendata.swiss");
  }, 20000);
});

// ── get_statistic ─────────────────────────────────────────────────────────────

describe("get_statistic — live (opendata.swiss)", () => {
  it("fetches a known BFS dataset", async () => {
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.id).toBe("bevolkerungsstatistik-einwohner");
    expect(result.title).toBeTruthy();
    expect(result.title.length).toBeGreaterThan(0);
  }, 20000);

  it("response is under 50K chars", async () => {
    const raw = await handleStatistics("get_statistic", {
      dataset_id: "bevolkerungsstatistik-einwohner",
    });
    expect(raw.length).toBeLessThan(50000);
  }, 20000);

  it("has resources array with url and format", async () => {
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(Array.isArray(result.resources)).toBe(true);
    if (result.resources.length > 0) {
      expect(result.resources[0].url).toBeTruthy();
      expect(result.resources[0].format).toBeTruthy();
    }
  }, 20000);

  it("has organization field", async () => {
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.organization).toBeTruthy();
  }, 20000);

  it("has source_url pointing to dataset page", async () => {
    const result = JSON.parse(
      await handleStatistics("get_statistic", {
        dataset_id: "bevolkerungsstatistik-einwohner",
      })
    );
    expect(result.source_url).toContain("opendata.swiss");
    expect(result.source_url).toContain("bevolkerungsstatistik-einwohner");
  }, 20000);

  it("throws on nonexistent dataset", async () => {
    await expect(
      handleStatistics("get_statistic", {
        dataset_id: "this-dataset-does-not-exist-xyz-999",
      })
    ).rejects.toThrow();
  }, 20000);
});
