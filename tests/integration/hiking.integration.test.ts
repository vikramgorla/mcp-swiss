// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleHiking } from "../../src/modules/hiking.js";

// Bern coordinates
const BERN_LAT = 46.948;
const BERN_LON = 7.4474;

describe("Hiking Trail Closures API (live)", () => {
  it("get_trail_closures returns closures without filters", async () => {
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("closures");
    expect(Array.isArray(result.closures)).toBe(true);
    expect(result.source).toContain("ASTRA");
  });

  it("get_trail_closures returns non-zero results (real data)", async () => {
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    // There are always some closures in Switzerland
    expect(result.total_found).toBeGreaterThan(0);
  });

  it("get_trail_closures each closure has expected shape", async () => {
    const result = JSON.parse(await handleHiking("get_trail_closures", {}));
    if (result.closures.length > 0) {
      const c = result.closures[0];
      expect(c).toHaveProperty("id");
      expect(typeof c.id).toBe("number");
      expect(c).toHaveProperty("title");
      expect(c).toHaveProperty("reason");
      expect(c).toHaveProperty("duration");
      expect(c).toHaveProperty("type");
      expect(c).toHaveProperty("type_raw");
      expect(["closed_way", "detour"]).toContain(c.type_raw);
    }
  });

  it("get_trail_closures filter by reason=Steinschlag returns rockfall closures", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { reason: "Steinschlag" })
    );
    expect(result.filter.reason).toBe("Steinschlag");
    // All reasons should relate to Steinschlag/rockfall
    for (const c of result.closures) {
      const r = c.reason.toLowerCase();
      const isRockfall =
        r.includes("stone") || r.includes("rock") || r.includes("chipping");
      expect(isRockfall).toBe(true);
    }
  });

  it("get_trail_closures filter by type=closure returns only closed_way", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { type: "closure" })
    );
    for (const c of result.closures) {
      expect(c.type_raw).toBe("closed_way");
    }
  });

  it("get_trail_closures filter by type=detour returns only detour", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { type: "detour" })
    );
    for (const c of result.closures) {
      expect(c.type_raw).toBe("detour");
    }
  });

  it("get_trail_closures respects limit=5", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures", { limit: 5 })
    );
    expect(result.closures.length).toBeLessThanOrEqual(5);
    expect(result.filter.limit).toBe(5);
  });

  it("get_trail_closures response is under 50K chars", async () => {
    const raw = await handleHiking("get_trail_closures", {});
    expect(raw.length).toBeLessThan(50000);
  });

  it("get_trail_closures response is valid JSON", async () => {
    const raw = await handleHiking("get_trail_closures", {});
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("get_trail_closures_nearby returns results for Bern", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("closures");
    expect(result).toHaveProperty("query");
    expect(result.query.lat).toBe(BERN_LAT);
    expect(result.query.lon).toBe(BERN_LON);
    expect(result.query.radius_m).toBe(10000);
  });

  it("get_trail_closures_nearby returns correct LV95 for Bern", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", { lat: BERN_LAT, lon: BERN_LON })
    );
    // Bern LV95 E should be around 2600500–2601000
    expect(result.query.lv95_e).toBeGreaterThan(2600000);
    expect(result.query.lv95_e).toBeLessThan(2602000);
    // Bern LV95 N should be around 1199000–1200500
    expect(result.query.lv95_n).toBeGreaterThan(1199000);
    expect(result.query.lv95_n).toBeLessThan(1200500);
  });

  it("get_trail_closures_nearby closures have expected shape", async () => {
    const result = JSON.parse(
      await handleHiking("get_trail_closures_nearby", {
        lat: BERN_LAT,
        lon: BERN_LON,
        radius: 50000,
      })
    );
    for (const c of result.closures) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("title");
      expect(c).toHaveProperty("reason");
      expect(c).toHaveProperty("duration");
      expect(c).toHaveProperty("type");
      expect(c).toHaveProperty("type_raw");
    }
  });

  it("get_trail_closures_nearby response is under 50K chars", async () => {
    const raw = await handleHiking("get_trail_closures_nearby", {
      lat: BERN_LAT,
      lon: BERN_LON,
    });
    expect(raw.length).toBeLessThan(50000);
  });

  it("get_trail_closures_nearby response is valid JSON", async () => {
    const raw = await handleHiking("get_trail_closures_nearby", {
      lat: BERN_LAT,
      lon: BERN_LON,
    });
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("get_trail_closures_nearby with small radius returns fewer results", async () => {
    const small = JSON.parse(
      await handleHiking("get_trail_closures_nearby", {
        lat: BERN_LAT,
        lon: BERN_LON,
        radius: 100,
      })
    );
    const large = JSON.parse(
      await handleHiking("get_trail_closures_nearby", {
        lat: BERN_LAT,
        lon: BERN_LON,
        radius: 50000,
      })
    );
    expect(small.count).toBeLessThanOrEqual(large.count);
  });
});
