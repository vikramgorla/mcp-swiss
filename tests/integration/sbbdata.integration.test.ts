// These tests hit the live SBB Open Data portal — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleSbbData } from "../../src/modules/sbbdata.js";

describe("SBB Open Data portal (live — data.sbb.ch)", () => {
  it("get_station_passengers returns Bern frequencies", async () => {
    const raw = await handleSbbData("get_station_passengers", { station: "Bern", limit: 3 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.count).toBeGreaterThan(0);
    expect(result.stations[0].station).toBe("Bern");
    expect(result.stations[0].daily_avg).toBeGreaterThan(1000);
    expect(result.stations[0].canton).toBe("BE");
  }, 20000);

  it("get_station_punctuality summarises the previous day at Bern", async () => {
    const raw = await handleSbbData("get_station_punctuality", { station: "Bern", limit: 3 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.stops).toBeGreaterThan(0);
    expect(result.operating_day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.delayed_arrivals).toBeGreaterThanOrEqual(0);
    expect(result.delayed_arrivals).toBeLessThanOrEqual(result.stops);
    expect(typeof result.on_time_arrivals_pct).toBe("number");
  }, 20000);

  it("get_station_accessibility lists Bern platforms", async () => {
    const raw = await handleSbbData("get_station_accessibility", { station: "Bern" });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.platform_count).toBeGreaterThan(0);
    expect(result.rail_free_platforms).toBeGreaterThan(0);
    expect(result.platforms[0].station).toBe("Bern");
    expect(typeof result.platforms[0].rail_free_access).toBe("boolean");
  }, 20000);
});
