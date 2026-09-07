// These tests hit the real MeteoSwiss API — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handlePollen } from "../../src/modules/pollen.js";

describe("Pollen API (live — MeteoSwiss)", () => {
  // ── get_pollen_current ──────────────────────────────────────────────────

  it("get_pollen_current returns data for PZH", async () => {
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PZH" }),
    );
    expect(result.station).toBe("PZH");
    expect(result.source).toBe("MeteoSwiss");
    expect(result.recent_hours.length).toBeGreaterThan(0);
    expect(result.latest_timestamp).toBeDefined();
  });

  it("current pollen has expected shape", async () => {
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "PBE" }),
    );
    expect(result.current_levels).toBeDefined();
    expect(result.pollen_types).toHaveLength(7);
    const reading = result.recent_hours[0];
    expect(reading.pollen.length).toBe(7);
    for (const p of reading.pollen) {
      expect(typeof p.type).toBe("string");
      expect(p.concentration === null || typeof p.concentration === "number").toBe(true);
      expect(p.unit).toBe("pollen/m³");
    }
  });

  it("current pollen station code is case-insensitive", async () => {
    const result = JSON.parse(
      await handlePollen("get_pollen_current", { station: "pzh" }),
    );
    expect(result.station).toBe("PZH");
  });

  it("current pollen response is under 50K chars", async () => {
    const raw = await handlePollen("get_pollen_current", { station: "PZH" });
    expect(raw.length).toBeLessThan(50000);
  });

  // ── get_pollen_daily ────────────────────────────────────────────────────

  it("get_pollen_daily returns data for PBE", async () => {
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE" }),
    );
    expect(result.station).toBe("PBE");
    expect(result.source).toBe("MeteoSwiss");
    expect(result.days).toBeGreaterThan(0);
    expect(result.daily.length).toBeGreaterThan(0);
  });

  it("daily pollen has expected shape", async () => {
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBE", days: 3 }),
    );
    expect(result.days).toBeGreaterThan(0);
    expect(result.days).toBeLessThanOrEqual(3);
    for (const day of result.daily) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.pollen).toHaveLength(7);
      for (const p of day.pollen) {
        expect(typeof p.type).toBe("string");
        expect(p.concentration === null || typeof p.concentration === "number").toBe(true);
      }
    }
  });

  it("daily pollen limits days correctly", async () => {
    const result = JSON.parse(
      await handlePollen("get_pollen_daily", { station: "PBS", days: 5 }),
    );
    expect(result.days).toBeLessThanOrEqual(5);
  });

  it("daily pollen response is under 50K chars", async () => {
    const raw = await handlePollen("get_pollen_daily", {
      station: "PBE",
      days: 30,
    });
    expect(raw.length).toBeLessThan(50000);
  });

  // ── list_pollen_stations ────────────────────────────────────────────────

  it("list_pollen_stations returns all stations", async () => {
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    expect(result.count).toBeGreaterThanOrEqual(16);
    expect(result.source).toBe("MeteoSwiss");
    expect(result.network).toContain("MeteoSwiss");
  });

  it("stations have expected fields", async () => {
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", {}),
    );
    for (const s of result.stations) {
      expect(typeof s.code).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.canton).toBe("string");
      expect(s.altitude_m === null || typeof s.altitude_m === "number").toBe(true);
    }
  });

  it("canton filter works", async () => {
    const result = JSON.parse(
      await handlePollen("list_pollen_stations", { canton: "BE" }),
    );
    expect(result.count).toBeGreaterThanOrEqual(1);
    for (const s of result.stations) {
      expect(s.canton).toBe("BE");
    }
  });

  it("stations response is under 50K chars", async () => {
    const raw = await handlePollen("list_pollen_stations", {});
    expect(raw.length).toBeLessThan(50000);
  });
});
