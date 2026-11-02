// These tests hit the real geo.admin.ch GWR layer — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleGwr } from "../../src/modules/gwr.js";

// Hôtel de Ville de Lausanne (Hôtel Seigneux), Place de la Palud 2 — non-residential, built ~1700
const LAUSANNE_TOWN_HALL = 2119257;
// Place Marc-Louis-Arlaud 1 / Rue Saint-Laurent 6+8, Lausanne — 3 entrances, 15 dwellings
const LAUSANNE_MULTI_ENTRANCE = 882657;

describe("GWR API (live — BFS via geo.admin.ch)", () => {
  // ── search_buildings ────────────────────────────────────────────────────

  it("search_buildings finds the Lausanne town hall by address", async () => {
    const result = JSON.parse(
      await handleGwr("search_buildings", { address: "Place de la Palud 2 Lausanne", limit: 3 })
    );
    expect(result.count).toBeGreaterThan(0);
    const hit = result.buildings.find((b: { egid: number }) => b.egid === LAUSANNE_TOWN_HALL);
    expect(hit).toBeDefined();
    expect(hit.address).toContain("Place de la Palud 2");
    expect(hit.municipality).toBe("Lausanne");
    expect(hit.canton).toBe("VD");
    expect(hit.category).toBe("Non-residential");
    expect(typeof hit.lat).toBe("number");
    expect(typeof hit.lon).toBe("number");
  });

  it("search_buildings respects limit and stays slim", async () => {
    const raw = await handleGwr("search_buildings", { address: "Bahnhofstrasse Zürich", limit: 20 });
    const result = JSON.parse(raw);
    expect(result.count).toBeLessThanOrEqual(20);
    expect(raw.length).toBeLessThan(20000);
  });

  // ── get_building ────────────────────────────────────────────────────────

  it("get_building returns decoded details for the town hall", async () => {
    const result = JSON.parse(await handleGwr("get_building", { egid: LAUSANNE_TOWN_HALL }));
    expect(result.egid).toBe(LAUSANNE_TOWN_HALL);
    expect(result.canton).toBe("VD");
    expect(result.bfs_municipality_number).toBe(5586);
    expect(result.class).toBe("Office building");
    expect(result.status).toBe("Existing");
    expect(result.construction_period).toBe("Before 1919");
    expect(result.coordinates.lat).toBeCloseTo(46.5218, 2);
    expect(result.coordinates.lon).toBeCloseTo(6.6329, 2);
    expect(result.coordinates.lv95_e).toBeGreaterThan(2_500_000);
    expect(Array.isArray(result.heating)).toBe(true);
    expect(result.source).toContain("GWR");
  });

  it("get_building merges entrances and lists dwellings", async () => {
    const result = JSON.parse(
      await handleGwr("get_building", { egid: LAUSANNE_MULTI_ENTRANCE, max_dwellings: 5 })
    );
    expect(result.entrances.length).toBeGreaterThanOrEqual(2);
    expect(result.dwellings_summary.count).toBeGreaterThan(5);
    expect(result.dwellings).toHaveLength(5);
    expect(result.dwellings_truncated).toBe(true);
    const d = result.dwellings[0];
    expect(typeof d.ewid).toBe("number");
    expect(d.floor === null || typeof d.floor === "string").toBe(true);
  });

  it("get_building throws for unknown EGID", async () => {
    await expect(handleGwr("get_building", { egid: 999999999 })).rejects.toThrow(/No building found/);
  });

  // ── buildings_near ──────────────────────────────────────────────────────

  it("buildings_near lists buildings around Place de la Palud, closest first", async () => {
    const result = JSON.parse(
      await handleGwr("buildings_near", { lat: 46.521793, lon: 6.632926, radius: 60, limit: 10 })
    );
    expect(result.count).toBeGreaterThan(0);
    expect(result.buildings.length).toBeLessThanOrEqual(10);
    for (const b of result.buildings) {
      expect(b.distance_m).toBeLessThanOrEqual(60);
    }
    const distances = result.buildings.map((b: { distance_m: number }) => b.distance_m);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(result.buildings.some((b: { egid: number }) => b.egid === LAUSANNE_TOWN_HALL)).toBe(true);
  });
});
