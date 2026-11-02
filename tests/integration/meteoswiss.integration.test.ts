// These tests hit live MeteoSwiss OGD STAC/CSV files — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleMeteoswiss } from "../../src/modules/meteoswiss.js";

describe("MeteoSwiss OGD (live — STAC CSV)", () => {
  it("list_ogd_stations returns SwissMetNet stations", async () => {
    const raw = await handleMeteoswiss("list_ogd_stations", { canton: "BE", limit: 10 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.count).toBeGreaterThan(0);
    for (const station of result.stations) {
      expect(station.canton).toBe("BE");
      expect(typeof station.code).toBe("string");
      expect(station.name).not.toContain("\uFFFD");
    }
  }, 20000);

  it("list_ogd_stations decodes station names", async () => {
    const result = JSON.parse(
      await handleMeteoswiss("list_ogd_stations", { query: "Zürich", limit: 5 })
    );
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.stations.some((station: { name: string }) => station.name.includes("Zürich"))).toBe(true);
  }, 20000);

  it("list_ogd_stations works for a second collection", async () => {
    const raw = await handleMeteoswiss("list_ogd_stations", { collection: "smn-precip", limit: 3 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.collection).toBe("ch.meteoschweiz.ogd-smn-precip");
    expect(result.count).toBeGreaterThan(0);
  }, 20000);

  it("get_ogd_recent returns latest hourly values for Bern", async () => {
    const raw = await handleMeteoswiss("get_ogd_recent", { station: "BER", granularity: "h", limit: 6 });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.station).toBe("BER");
    expect(result.count).toBeGreaterThan(0);
    expect(result.asset).toContain("h_now");
    const values = result.measurements[result.measurements.length - 1].values;
    expect(typeof values.tre200h0).toBe("number");
    expect(result.parameters.tre200h0.unit.length).toBeGreaterThan(0);
  }, 20000);

  it("get_ogd_history reads a short daily window from the recent file", async () => {
    const raw = await handleMeteoswiss("get_ogd_history", {
      station: "BER",
      granularity: "d",
      start_date: "2026-10-01",
      end_date: "2026-10-05",
    });
    expect(raw.length).toBeLessThan(50000);
    const result = JSON.parse(raw);
    expect(result.count).toBeGreaterThan(0);
    expect(result.assets[0]).toContain("d_recent");
    expect(result.measurements[0].time.startsWith("2026-10-")).toBe(true);
  }, 20000);
});
