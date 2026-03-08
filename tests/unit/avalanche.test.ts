import { describe, it, expect } from "vitest";
import { handleAvalanche, avalancheTools, SWISS_AVALANCHE_REGIONS } from "../../src/modules/avalanche.js";

// ── Tool definitions ──────────────────────────────────────────────────────────

describe("avalancheTools", () => {
  it("exports exactly 2 tools", () => {
    expect(avalancheTools).toHaveLength(2);
  });

  it("has get_avalanche_bulletin tool", () => {
    const tool = avalancheTools.find((t) => t.name === "get_avalanche_bulletin");
    expect(tool).toBeDefined();
    expect(tool?.description).toContain("SLF");
    expect(tool?.inputSchema.type).toBe("object");
  });

  it("has list_avalanche_regions tool", () => {
    const tool = avalancheTools.find((t) => t.name === "list_avalanche_regions");
    expect(tool).toBeDefined();
    expect(tool?.description).toContain("SLF");
    expect(tool?.inputSchema.type).toBe("object");
  });

  it("get_avalanche_bulletin has language enum", () => {
    const tool = avalancheTools.find((t) => t.name === "get_avalanche_bulletin");
    const langProp = tool?.inputSchema.properties?.language as Record<string, unknown>;
    expect(langProp?.enum).toEqual(["de", "en", "fr", "it"]);
  });

  it("list_avalanche_regions has canton filter property", () => {
    const tool = avalancheTools.find((t) => t.name === "list_avalanche_regions");
    expect(tool?.inputSchema.properties).toHaveProperty("canton");
  });
});

// ── SWISS_AVALANCHE_REGIONS ───────────────────────────────────────────────────

describe("SWISS_AVALANCHE_REGIONS", () => {
  it("has 22 regions", () => {
    expect(SWISS_AVALANCHE_REGIONS).toHaveLength(22);
  });

  it("all regions have id, name, canton, elevation_m", () => {
    for (const r of SWISS_AVALANCHE_REGIONS) {
      expect(r.id).toMatch(/^CH-\d+$/);
      expect(r.name).toBeTruthy();
      expect(r.canton).toBeTruthy();
      expect(typeof r.elevation_m).toBe("number");
      expect(r.elevation_m).toBeGreaterThan(0);
    }
  });

  it("includes major Swiss avalanche regions", () => {
    const names = SWISS_AVALANCHE_REGIONS.map((r) => r.name);
    expect(names).toContain("Central Graubünden");
    expect(names).toContain("Bernese Alps North");
    expect(names).toContain("Ticino North");
    expect(names).toContain("Jura");
  });

  it("IDs are unique", () => {
    const ids = SWISS_AVALANCHE_REGIONS.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ── get_avalanche_bulletin ────────────────────────────────────────────────────

describe("get_avalanche_bulletin", () => {
  it("returns date, source, bulletin_url, danger_scale, schedule, note", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.source).toContain("SLF");
    expect(result.bulletin_url).toBeDefined();
    expect(result.danger_scale).toBeDefined();
    expect(result.schedule).toBeDefined();
    expect(result.note).toBeTruthy();
  });

  it("returns interactive_map and pdf_full URLs", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.bulletin_url.interactive_map).toContain("whiterisk.ch");
    expect(result.bulletin_url.pdf_full).toContain("aws.slf.ch");
  });

  it("returns PDF URLs for all 4 languages", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    const pdfs = result.bulletin_url.pdf_regions;
    expect(pdfs.de).toContain("/de");
    expect(pdfs.en).toContain("/en");
    expect(pdfs.fr).toContain("/fr");
    expect(pdfs.it).toContain("/it");
  });

  it("danger_scale has entries for levels 1-5", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(Object.keys(result.danger_scale)).toHaveLength(5);
    expect(result.danger_scale["1"]).toContain("Low");
    expect(result.danger_scale["5"]).toContain("Very High");
  });

  it("uses English by default", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.bulletin_url.pdf_full).toContain("/en");
    expect(result.bulletin_url.interactive_map).toContain("/en/");
  });

  it("uses German when language=de", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { language: "de" }));
    expect(result.bulletin_url.pdf_full).toContain("/de");
    expect(result.bulletin_url.interactive_map).toContain("/de/");
  });

  it("uses French when language=fr", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { language: "fr" }));
    expect(result.bulletin_url.pdf_full).toContain("/fr");
  });

  it("uses Italian when language=it", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { language: "it" }));
    expect(result.bulletin_url.pdf_full).toContain("/it");
  });

  it("falls back to English for invalid language", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { language: "es" }));
    expect(result.bulletin_url.pdf_full).toContain("/en");
  });

  it("returns region info when region ID matches", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "CH-9" }));
    expect(result.region).toBeDefined();
    expect(result.region.id).toBe("CH-9");
    expect(result.region.name).toBe("Central Graubünden");
    expect(result.region.canton).toBe("GR");
    expect(result.region.typical_elevation_m).toBe(2500);
    expect(result.region.bulletin_link).toContain("CH-9");
    expect(result.tip).toContain("Central Graubünden");
  });

  it("matches region by name (partial, case-insensitive)", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "bernese alps" }));
    expect(result.region).toBeDefined();
    expect(result.region.name).toContain("Bernese Alps");
  });

  it("matches region by canton abbreviation (exact canton match)", async () => {
    // ZH only appears in canton strings, not region names — reliable canton-match test
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "ZH" }));
    expect(result.region).toBeDefined();
    expect(result.region.canton).toContain("ZH");
  });

  it("returns not_found + tip for unknown region", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "XYZ-99" }));
    expect(result.region_not_found).toBe("XYZ-99");
    expect(result.tip).toContain("list_avalanche_regions");
  });

  it("response is under 50K chars", async () => {
    const result = await handleAvalanche("get_avalanche_bulletin", {});
    expect(result.length).toBeLessThan(50000);
  });

  it("response is valid JSON", async () => {
    const result = await handleAvalanche("get_avalanche_bulletin", {});
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("schedule has morning and afternoon times", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.schedule.morning_bulletin).toContain("08:00");
    expect(result.schedule.afternoon_update).toContain("17:00");
    expect(result.schedule.season).toContain("October");
  });
});

// ── list_avalanche_regions ────────────────────────────────────────────────────

describe("list_avalanche_regions", () => {
  it("returns count, source, regions array, usage, and bulletin_map", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    expect(result.count).toBe(22);
    expect(result.source).toContain("SLF");
    expect(Array.isArray(result.regions)).toBe(true);
    expect(result.usage).toContain("get_avalanche_bulletin");
    expect(result.bulletin_map).toContain("whiterisk.ch");
  });

  it("returns all 22 regions without filter", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    expect(result.regions).toHaveLength(22);
    expect(result.count).toBe(22);
  });

  it("each region has id, name, canton, typical_elevation_m", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    for (const r of result.regions) {
      expect(r.id).toMatch(/^CH-\d+$/);
      expect(r.name).toBeTruthy();
      expect(r.canton).toBeTruthy();
      expect(typeof r.typical_elevation_m).toBe("number");
    }
  });

  it("filters by canton GR", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "GR" }));
    expect(result.regions.length).toBeGreaterThan(0);
    expect(result.count).toBe(result.regions.length);
    for (const r of result.regions) {
      expect(r.canton).toContain("GR");
    }
  });

  it("filters by canton VS", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "VS" }));
    expect(result.regions.length).toBeGreaterThan(0);
    for (const r of result.regions) {
      expect(r.canton).toContain("VS");
    }
  });

  it("canton filter is case-insensitive", async () => {
    const upper = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "GR" }));
    const lower = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "gr" }));
    expect(upper.count).toBe(lower.count);
  });

  it("returns empty array for unknown canton", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "XX" }));
    expect(result.regions).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  it("response is under 50K chars", async () => {
    const result = await handleAvalanche("list_avalanche_regions", {});
    expect(result.length).toBeLessThan(50000);
  });

  it("response is valid JSON", async () => {
    const result = await handleAvalanche("list_avalanche_regions", {});
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ── Error handling ─────────────────────────────────────────────────────────────

describe("error handling", () => {
  it("throws for unknown tool name", async () => {
    await expect(handleAvalanche("does_not_exist", {})).rejects.toThrow(
      "Unknown avalanche tool: does_not_exist"
    );
  });
});
