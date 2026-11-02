// These tests hit the live opendata.swiss CKAN API — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleOpendata } from "../../src/modules/opendata.js";

describe("opendata.swiss catalogue (live — CKAN)", () => {
  it("search_opendata returns catalogue hits", async () => {
    const raw = await handleOpendata("search_opendata", { query: "weather", limit: 5 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.length).toBeLessThanOrEqual(5);
    expect(typeof result.results[0].id).toBe("string");
    expect(typeof result.results[0].title).toBe("string");
    expect(result.source).toContain("opendata.swiss");
  }, 20000);

  it("search_opendata can filter by publisher", async () => {
    const result = JSON.parse(
      await handleOpendata("search_opendata", {
        query: "population",
        organization: "bundesamt-fur-statistik-bfs",
        limit: 3,
      })
    );
    expect(result.organization).toBe("bundesamt-fur-statistik-bfs");
    expect(result.returned).toBeGreaterThan(0);
  }, 20000);

  it("get_opendata_dataset returns one dataset", async () => {
    const raw = await handleOpendata("get_opendata_dataset", {
      dataset_id: "weather-station-klosters",
    });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.id).toBe("weather-station-klosters");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.resource_count).toBeGreaterThan(0);
    expect(result.source_url).toContain("weather-station-klosters");
  }, 20000);

  it("list_opendata_resources returns download links", async () => {
    const raw = await handleOpendata("list_opendata_resources", {
      dataset_id: "weather-station-klosters",
    });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.returned).toBeGreaterThan(0);
    expect(typeof result.resources[0].url).toBe("string");
    expect(result.resources[0].url.length).toBeGreaterThan(0);
  }, 20000);
});
