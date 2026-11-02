/**
 * Live tests against aws.slf.ch. The bulletin is seasonal, so nothing here
 * assumes one is in force today: each test accepts both shapes and only the
 * archived 2026-02-10 bulletin is checked field by field.
 */
import { describe, it, expect } from "vitest";
import { handleAvalanche, SWISS_AVALANCHE_REGIONS } from "../../src/modules/avalanche.js";

/** A winter day with a bulletin for the whole country. */
const WINTER_DAY = "2026-02-10";

describe("get_avalanche_bulletin (live)", () => {
  it("answers for today either with a bulletin or with a seasonal note", async () => {
    const raw = await handleAvalanche("get_avalanche_bulletin", {});
    const result = JSON.parse(raw);

    expect(typeof result.bulletin_in_force).toBe("boolean");
    expect(result.source.provider).toContain("SLF");
    expect(raw.length).toBeLessThan(50000);

    if (result.bulletin_in_force) {
      expect(result.scope).toBe("Switzerland");
      expect(Array.isArray(result.areas)).toBe(true);
      expect(result.areas.length).toBeGreaterThan(0);
      expect(result.valid.startTime).toBeTruthy();
    } else {
      expect(result.season).toMatch(/winter season/i);
      expect(result.last_bulletin.valid_until).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  }, 60000);

  it("returns the archived bulletin for a region", async () => {
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "CH-5123", date: WINTER_DAY })
    );

    expect(result.bulletin_in_force).toBe(true);
    expect(result.region).toEqual({ id: "CH-5123", name: "Davos", canton: "GR" });
    expect(result.danger.level).toBeGreaterThanOrEqual(1);
    expect(result.danger.level).toBeLessThanOrEqual(5);
    expect(typeof result.danger.label).toBe("string");
    expect(result.valid.startTime.slice(0, 10)).toBe(WINTER_DAY);
    expect(result.covers_regions).toContain("CH-5123");
    expect(result.danger_scale["3"]).toMatch(/considerable/i);
  }, 60000);

  it("gives problems with a type, and an elevation or aspect where SLF sets one", async () => {
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "Zermatt", date: WINTER_DAY })
    );

    expect(Array.isArray(result.problems)).toBe(true);
    expect(result.problems.length).toBeGreaterThan(0);
    for (const problem of result.problems) {
      expect(typeof problem.type).toBe("string");
      if (problem.elevation) expect(problem.elevation).toMatch(/^(above|below|between) /);
      if (problem.aspects) expect(problem.aspects.every((a: string) => /^[NSEW]{1,2}$/.test(a))).toBe(true);
    }
    // at least one problem carries the prose advice
    expect(result.problems.some((p: { advice?: string }) => (p.advice ?? "").length > 40)).toBe(true);
  }, 60000);

  it("resolves a coordinate to the bulletin covering it", async () => {
    // Jungfraujoch
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { lat: 46.5475, lon: 7.9806, date: WINTER_DAY })
    );

    expect(result.bulletin_in_force).toBe(true);
    expect(result.point).toEqual({ lat: 46.5475, lon: 7.9806 });
    expect(result.covers_regions.length).toBeGreaterThan(0);
    expect(result.danger.level).toBeGreaterThanOrEqual(1);
  }, 60000);

  it("reports a coordinate outside the bulletin area", async () => {
    // Geneva city, far from any warning region
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { lat: 46.2044, lon: 6.1432, date: WINTER_DAY })
    );
    expect(result.note).toContain("No warning region covers");
  }, 60000);

  it("serves all four languages", async () => {
    for (const language of ["de", "en", "fr", "it"]) {
      const result = JSON.parse(
        await handleAvalanche("get_avalanche_bulletin", { region: "CH-5123", language, date: WINTER_DAY })
      );
      expect(result.bulletin_in_force).toBe(true);
      expect(result.source.api).toContain(`/caaml/${language}/json`);
      expect(result.problems[0].advice).toBeTruthy();
    }
  }, 120000);

  it("reports no bulletin in force in midsummer", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { date: "2026-07-15" }));
    expect(result.bulletin_in_force).toBe(false);
    expect(result.season).toMatch(/summer/i);
  }, 60000);

  it("keeps a national bulletin slim", async () => {
    const raw = await handleAvalanche("get_avalanche_bulletin", { date: WINTER_DAY });
    expect(raw.length).toBeLessThan(50000);
    expect(JSON.parse(raw).areas.length).toBeGreaterThan(3);
  }, 60000);
});

describe("list_avalanche_regions (live)", () => {
  it("matches the region ids the live bulletin uses", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { date: WINTER_DAY }));
    const known = new Set(SWISS_AVALANCHE_REGIONS.map((r) => r.id));
    const ids: string[] = result.areas.flatMap((a: { regions: { id: string }[] }) => a.regions.map((r) => r.id));

    expect(ids.length).toBeGreaterThan(100);
    expect(ids.filter((id) => !known.has(id))).toEqual([]);
  }, 60000);

  it("names regions the way the bulletin names them", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { date: WINTER_DAY }));
    const byId = new Map(SWISS_AVALANCHE_REGIONS.map((r) => [r.id, r.name]));
    for (const area of result.areas) {
      for (const region of area.regions) expect(byId.get(region.id)).toBe(region.name);
    }
  }, 60000);
});
