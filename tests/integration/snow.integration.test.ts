// These tests hit the real SLF API — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleSnow } from "../../src/modules/snow.js";

describe("Snow API (live — SLF/WSL)", () => {
  // ── get_snow_conditions ─────────────────────────────────────────────────

  it("get_snow_conditions returns stations with snow data", async () => {
    const result = JSON.parse(await handleSnow("get_snow_conditions", {}));
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.stations)).toBe(true);
    expect(result.source).toContain("SLF");
  });

  it("snow conditions have expected shape", async () => {
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { limit: 5 })
    );
    expect(result.stations.length).toBeGreaterThan(0);
    const s = result.stations[0];
    expect(typeof s.station).toBe("string");
    expect(typeof s.code).toBe("string");
    expect(typeof s.altitude_m).toBe("number");
    expect(typeof s.canton).toBe("string");
    // HS can be null if no snow
    expect(s.snow_depth_cm === null || typeof s.snow_depth_cm === "number").toBe(true);
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("snow conditions filtered by canton GR", async () => {
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { canton: "GR", limit: 50 })
    );
    for (const s of result.stations) {
      expect(s.canton).toBe("GR");
    }
  });

  it("snow conditions filtered by min_altitude", async () => {
    const result = JSON.parse(
      await handleSnow("get_snow_conditions", { min_altitude: 2500, limit: 50 })
    );
    for (const s of result.stations) {
      expect(s.altitude_m).toBeGreaterThanOrEqual(2500);
    }
  });

  it("snow conditions response is under 50K chars", async () => {
    const raw = await handleSnow("get_snow_conditions", { limit: 100 });
    expect(raw.length).toBeLessThan(50000);
  });

  // ── list_snow_stations ──────────────────────────────────────────────────

  it("list_snow_stations returns stations", async () => {
    const result = JSON.parse(await handleSnow("list_snow_stations", { limit: 50 }));
    expect(result.count).toBeGreaterThan(0);
    expect(result.total_stations).toBeGreaterThan(200); // 207 IMIS + 100 study = 307
    expect(result.source).toContain("SLF");
  });

  it("stations have expected shape", async () => {
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { limit: 5 })
    );
    const s = result.stations[0];
    expect(typeof s.code).toBe("string");
    expect(typeof s.name).toBe("string");
    expect(typeof s.altitude_m).toBe("number");
    expect(typeof s.canton).toBe("string");
    expect(["imis", "study-plot"]).toContain(s.type);
  });

  it("filters by type=imis", async () => {
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { type: "imis", limit: 50 })
    );
    for (const s of result.stations) {
      expect(s.type).toBe("imis");
    }
  });

  it("filters by type=study-plot", async () => {
    const result = JSON.parse(
      await handleSnow("list_snow_stations", { type: "study-plot", limit: 50 })
    );
    for (const s of result.stations) {
      expect(s.type).toBe("study-plot");
    }
  });

  it("list_snow_stations response is under 50K chars", async () => {
    const raw = await handleSnow("list_snow_stations", { limit: 200 });
    expect(raw.length).toBeLessThan(50000);
  });

  // ── get_snow_measurements ───────────────────────────────────────────────

  it("get_snow_measurements returns IMIS data for DAV2", async () => {
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    expect(result.station_code).toBe("DAV2");
    expect(result.type).toBe("imis");
    expect(result.measurement_count).toBeGreaterThan(0);
    expect(Array.isArray(result.measurements)).toBe(true);
  });

  it("IMIS measurements have weather fields", async () => {
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", { station_code: "DAV2" })
    );
    const m = result.measurements[0];
    expect(m.time).toBeDefined();
    expect(m.snow_depth_cm === null || typeof m.snow_depth_cm === "number").toBe(true);
    expect(m.air_temp_c === null || typeof m.air_temp_c === "number").toBe(true);
  });

  it("get_snow_measurements returns study-plot data", async () => {
    // First get a study plot station code
    const stations = JSON.parse(
      await handleSnow("list_snow_stations", { type: "study-plot", limit: 1 })
    );
    if (stations.count === 0) {
      console.log("No study-plot stations — skipping");
      return;
    }
    const code = stations.stations[0].code;
    const result = JSON.parse(
      await handleSnow("get_snow_measurements", {
        station_code: code,
        type: "study-plot",
      })
    );
    expect(result.station_code).toBe(code);
    expect(result.type).toBe("study-plot");
  });

  it("measurements response is under 50K chars", async () => {
    const raw = await handleSnow("get_snow_measurements", {
      station_code: "DAV2",
    });
    expect(raw.length).toBeLessThan(50000);
  });
});
