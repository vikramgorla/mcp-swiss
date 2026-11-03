// These tests hit the live geo.admin ech MapServer — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleMaplayers } from "../../src/modules/maplayers.js";

const LAYER = "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill";

describe("geo.admin ech MapServer (live)", () => {
  it("search_map_layers finds municipal boundaries", async () => {
    const raw = await handleMaplayers("search_map_layers", { query: "gemeinde", limit: 8 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.layers.some((layer: { layer_id: string }) => layer.layer_id === LAYER)).toBe(true);
  }, 30000);

  it("identify_map_layer returns the current municipality at a point", async () => {
    const raw = await handleMaplayers("identify_map_layer", {
      layer: LAYER,
      lat: 46.948,
      lng: 7.4474,
      tolerance: 0,
    });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.returned).toBeGreaterThan(0);
    expect(result.results[0].attributes.gemname).toBe("Bern");
    expect(result.current_only).toBe(true);
  }, 30000);

  it("find_map_features finds Bern by municipality name", async () => {
    const raw = await handleMaplayers("find_map_features", {
      layer: LAYER,
      search_field: "gemname",
      search_text: "Bern",
      contains: false,
      limit: 5,
    });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.returned).toBeGreaterThan(0);
    expect(result.results[0].attributes.gemname).toBe("Bern");
    expect(result.results[0].attributes.is_current_jahr).toBe(true);
  }, 30000);
});
