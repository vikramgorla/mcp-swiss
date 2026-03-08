/**
 * Integration tests for the Swiss Avalanche Bulletin module
 *
 * These tests verify the module works correctly end-to-end.
 * No external HTTP calls are made — the module returns static data
 * and URL pointers (the SLF JSON API requires authentication).
 *
 * Run with: npx vitest run tests/integration/avalanche.integration.test.ts
 */
import { describe, it, expect } from "vitest";
import { handleAvalanche, avalancheTools, SWISS_AVALANCHE_REGIONS } from "../../src/modules/avalanche.js";

// ── Module integrity ──────────────────────────────────────────────────────────

describe("Avalanche module integrity", () => {
  it("exports avalancheTools array", () => {
    expect(Array.isArray(avalancheTools)).toBe(true);
    expect(avalancheTools.length).toBeGreaterThan(0);
  });

  it("exports SWISS_AVALANCHE_REGIONS", () => {
    expect(Array.isArray(SWISS_AVALANCHE_REGIONS)).toBe(true);
    expect(SWISS_AVALANCHE_REGIONS.length).toBeGreaterThan(0);
  });

  it("exports handleAvalanche function", () => {
    expect(typeof handleAvalanche).toBe("function");
  });
});

// ── get_avalanche_bulletin — full integration ─────────────────────────────────

describe("get_avalanche_bulletin integration", () => {
  it("returns valid JSON with required fields", async () => {
    const raw = await handleAvalanche("get_avalanche_bulletin", {});
    const result = JSON.parse(raw);

    expect(result.date).toBeTruthy();
    expect(result.source).toBeTruthy();
    expect(result.bulletin_url).toBeTruthy();
    expect(result.danger_scale).toBeTruthy();
    expect(result.schedule).toBeTruthy();
    expect(result.note).toBeTruthy();
  });

  it("date is today (ISO format)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.date).toBe(today);
  });

  it("all 4 language PDF URLs are well-formed https URLs", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    const pdfs = result.bulletin_url.pdf_regions;
    for (const lang of ["de", "en", "fr", "it"]) {
      expect(pdfs[lang]).toMatch(/^https:\/\/aws\.slf\.ch\//);
    }
  });

  it("interactive map URL points to whiterisk.ch", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.bulletin_url.interactive_map).toMatch(/^https:\/\/whiterisk\.ch\//);
  });

  it("all 5 danger levels present and descriptive", async () => {
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    const scale = result.danger_scale;
    expect(scale["1"]).toContain("Low");
    expect(scale["2"]).toContain("Moderate");
    expect(scale["3"]).toContain("Considerable");
    expect(scale["4"]).toContain("High");
    expect(scale["5"]).toContain("Very High");
  });

  it("works with all supported languages", async () => {
    for (const lang of ["de", "en", "fr", "it"]) {
      const result = JSON.parse(
        await handleAvalanche("get_avalanche_bulletin", { language: lang })
      );
      expect(result.bulletin_url.pdf_full).toContain(`/${lang}`);
    }
  });

  it("region lookup works for CH-9 (Central Graubünden)", async () => {
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "CH-9" })
    );
    expect(result.region.id).toBe("CH-9");
    expect(result.region.name).toBe("Central Graubünden");
    expect(result.region.bulletin_link).toContain("whiterisk.ch");
    expect(result.region.bulletin_link).toContain("CH-9");
  });

  it("region lookup works for CH-4 (Western Alps / Valais)", async () => {
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "CH-4", language: "de" })
    );
    expect(result.region.id).toBe("CH-4");
    expect(result.region.canton).toContain("VS");
  });

  it("region lookup by name works case-insensitively", async () => {
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "jura" })
    );
    expect(result.region.id).toBe("CH-1");
    expect(result.region.name).toBe("Jura");
  });

  it("unknown region returns helpful tip", async () => {
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "Mordor" })
    );
    expect(result.region_not_found).toBe("Mordor");
    expect(result.tip).toContain("list_avalanche_regions");
  });

  it("response under 50K chars for all languages and all regions", async () => {
    for (const lang of ["de", "en", "fr", "it"]) {
      for (const region of ["CH-1", "CH-9", "CH-18", "CH-22"]) {
        const raw = await handleAvalanche("get_avalanche_bulletin", { region, language: lang });
        expect(raw.length).toBeLessThan(50000);
      }
    }
  });
});

// ── list_avalanche_regions — full integration ─────────────────────────────────

describe("list_avalanche_regions integration", () => {
  it("returns all 22 Swiss avalanche warning regions", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    expect(result.count).toBe(22);
    expect(result.regions).toHaveLength(22);
  });

  it("all region IDs follow CH-N format", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    for (const r of result.regions) {
      expect(r.id).toMatch(/^CH-\d+$/);
    }
  });

  it("Graubünden filter returns all GR regions", async () => {
    const result = JSON.parse(
      await handleAvalanche("list_avalanche_regions", { canton: "GR" })
    );
    // GR has many regions: Prättigau, Central GR, Engadine, Silvretta, etc.
    expect(result.count).toBeGreaterThanOrEqual(6);
    for (const r of result.regions) {
      expect(r.canton).toContain("GR");
    }
  });

  it("Valais (VS) filter returns multiple regions", async () => {
    const result = JSON.parse(
      await handleAvalanche("list_avalanche_regions", { canton: "VS" })
    );
    expect(result.count).toBeGreaterThanOrEqual(2);
  });

  it("Ticino (TI) filter returns North and South Ticino", async () => {
    const result = JSON.parse(
      await handleAvalanche("list_avalanche_regions", { canton: "TI" })
    );
    expect(result.count).toBe(2);
    const names = result.regions.map((r: { name: string }) => r.name);
    expect(names).toContain("Ticino North");
    expect(names.some((n: string) => n.includes("South"))).toBe(true);
  });

  it("response is valid JSON and under 50K", async () => {
    const raw = await handleAvalanche("list_avalanche_regions", {});
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(raw.length).toBeLessThan(50000);
  });

  it("bulletin_map URL in result is whiterisk.ch", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    expect(result.bulletin_map).toContain("whiterisk.ch");
  });
});

// ── Tool schema compliance ────────────────────────────────────────────────────

describe("Tool schema compliance", () => {
  it("every tool has name, description, inputSchema", () => {
    for (const tool of avalancheTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it("no tool has required params with no defaults", () => {
    // Both avalanche tools have all-optional params
    for (const tool of avalancheTools) {
      expect(tool.inputSchema.required ?? []).toHaveLength(0);
    }
  });
});
