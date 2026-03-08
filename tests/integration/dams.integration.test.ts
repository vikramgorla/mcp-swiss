// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handleDams } from "../../src/modules/dams.js";

// ── search_dams ──────────────────────────────────────────────────────────────

describe("search_dams (live API)", () => {
  it("finds Grande Dixence by dam name", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Grande Dixence" })
    );
    expect(result.results).toHaveLength(1);
    expect(result.results[0].dam_name).toBe("Grande Dixence");
  });

  it("returns height and crest_length for Grande Dixence", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Grande Dixence" })
    );
    const dam = result.results[0];
    expect(dam.height_m).toBe(285);
    expect(dam.crest_length_m).toBe(695);
  });

  it("returns volume in million m3 for Grande Dixence", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Grande Dixence" })
    );
    expect(result.results[0].volume_million_m3).toBe(385);
  });

  it("resolves canton for Grande Dixence as VS (or null if canton API unavailable)", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Grande Dixence" })
    );
    // Canton is resolved via a secondary swisstopo API call; may be null if API is slow
    const canton = result.results[0].canton;
    expect(canton === "VS" || canton === null).toBe(true);
  });

  it("returns year_built for Grande Dixence", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Grande Dixence" })
    );
    expect(result.results[0].year_built).toBe(1961);
  });

  it("finds Grimsel dams by reservoir name (fallback)", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Grimsel" })
    );
    // Grimsel hits damname search directly
    expect(result.results.length).toBeGreaterThan(0);
    const names = result.results.map((d: { dam_name: string }) => d.dam_name);
    const hasGrimsel = names.some((n: string) => n.toLowerCase().includes("grimsel") ||
      result.results.some((d: { reservoir: string }) => d.reservoir === "Grimsel"));
    expect(hasGrimsel || result.results[0].reservoir === "Grimsel").toBe(true);
  });

  it("returns empty results for nonsense query", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "xyzabc999notadam" })
    );
    expect(result.results).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(result.message).toContain("No dams found");
  });

  it("response is under 50K chars", async () => {
    const raw = await handleDams("search_dams", { query: "Grande Dixence" });
    expect(raw.length).toBeLessThan(50000);
  });

  it("finds Mattmark dam", async () => {
    const result = JSON.parse(
      await handleDams("search_dams", { query: "Mattmark" })
    );
    expect(result.results.length).toBeGreaterThan(0);
    const dam = result.results.find(
      (d: { dam_name: string }) => d.dam_name === "Mattmark"
    );
    expect(dam).toBeDefined();
  });
});

// ── get_dams_by_canton ───────────────────────────────────────────────────────

describe("get_dams_by_canton (live API)", () => {
  it("returns dams for VS (Valais)", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "VS" })
    );
    expect(result.canton).toBe("VS");
    expect(Array.isArray(result.dams)).toBe(true);
    expect(result.count).toBeGreaterThan(5);
  });

  it("Grande Dixence is in VS results", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "VS" })
    );
    const names = result.dams.map((d: { dam_name: string }) => d.dam_name);
    expect(names).toContain("Grande Dixence");
  });

  it("returns dams for GR (Graubünden)", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "GR" })
    );
    expect(result.canton).toBe("GR");
    expect(result.count).toBeGreaterThan(0);
  });

  it("accepts lowercase canton code", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "vs" })
    );
    expect(result.canton).toBe("VS");
    expect(result.count).toBeGreaterThan(0);
  });

  it("all dam results have canton set", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "VS" })
    );
    for (const dam of result.dams) {
      expect(dam.canton).toBe("VS");
    }
  });

  it("dam results have required fields", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "VS" })
    );
    for (const dam of result.dams) {
      expect(dam.dam_name).toBeTruthy();
      expect(dam.dam_type).toBeTruthy();
      expect(dam.facility).toBeTruthy();
      expect(dam.reservoir).toBeTruthy();
    }
  });

  it("response is under 50K chars", async () => {
    const raw = await handleDams("get_dams_by_canton", { canton: "VS" });
    expect(raw.length).toBeLessThan(50000);
  });

  it("includes source link", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "VS" })
    );
    expect(result.source).toContain("geo.admin.ch");
  });

  it("count matches dams array length", async () => {
    const result = JSON.parse(
      await handleDams("get_dams_by_canton", { canton: "GR" })
    );
    expect(result.count).toBe(result.dams.length);
  });

  it("rejects invalid canton code XX", async () => {
    await expect(
      handleDams("get_dams_by_canton", { canton: "XX" })
    ).rejects.toThrow();
  });
});

// ── get_dam_details ──────────────────────────────────────────────────────────

describe("get_dam_details (live API)", () => {
  it("returns full details for Grande Dixence", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(result.found).toBe(true);
    expect(result.dam_name).toBe("Grande Dixence");
  });

  it("includes multilingual dam_type", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(result.dam_type.english).toBe("gravity dam");
    expect(result.dam_type.german).toBe("Gewichtsmauer");
    expect(result.dam_type.french).toBe("barrage poids");
  });

  it("includes reservoir volume and levels", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(result.reservoir.volume_million_m3).toBe(385);
    expect(result.reservoir.impoundment_level_masl).toBe(2364);
  });

  it("includes operation year and supervision start", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(result.operation.year_built).toBe(1961);
    expect(result.operation.start_of_federal_supervision).toBeTruthy();
  });

  it("includes canton VS for Grande Dixence", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(result.canton).toBe("VS");
  });

  it("includes crest_level_masl", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(result.crest_level_masl).toBeGreaterThan(2000);
  });

  it("returns found:false for nonexistent dam", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Nonexistent Dam 12345" })
    );
    expect(result.found).toBe(false);
    expect(result.message).toContain("No dam found");
  });

  it("response is under 50K chars", async () => {
    const raw = await handleDams("get_dam_details", { name: "Grande Dixence" });
    expect(raw.length).toBeLessThan(50000);
  });

  it("includes feature_id", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Grande Dixence" })
    );
    expect(typeof result.feature_id).toBe("number");
    expect(result.feature_id).toBeGreaterThan(0);
  });

  it("returns details for Spitallamm (arch-gravity dam)", async () => {
    const result = JSON.parse(
      await handleDams("get_dam_details", { name: "Spitallamm" })
    );
    expect(result.found).toBe(true);
    expect(result.dam_type.english).toBe("arch-gravity dam");
    expect(result.operation.year_built).toBe(1932);
  });
});
