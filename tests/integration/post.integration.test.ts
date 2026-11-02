// These tests hit real APIs — run with: npm run test:integration
import { describe, it, expect } from "vitest";
import { handlePost } from "../../src/modules/post.js";

// ── lookup_postcode ───────────────────────────────────────────────────────────

describe("lookup_postcode (live API)", () => {
  it("finds Zürich 8001 with full details", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.found).toBe(true);
    expect(result.postcode).toBe(8001);
    expect(result.locality).toMatch(/Z[uü]rich/i);
  });

  it("includes WGS84 coordinates in Switzerland", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.coordinates).not.toBeNull();
    expect(result.coordinates.lat).toBeGreaterThan(45);
    expect(result.coordinates.lat).toBeLessThan(48);
    expect(result.coordinates.lon).toBeGreaterThan(5);
    expect(result.coordinates.lon).toBeLessThan(11);
  });

  it("includes canton code ZH for Zürich", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.canton).not.toBeNull();
    expect(result.canton.code).toBe("ZH");
  });

  it("finds Bern 3011 in canton BE", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "3011" })
    );
    expect(result.found).toBe(true);
    expect(result.postcode).toBe(3011);
    expect(result.canton.code).toBe("BE");
  });

  it("finds Lugano 6900 in canton TI", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "6900" })
    );
    expect(result.found).toBe(true);
    expect(result.canton.code).toBe("TI");
  });

  it("reports the municipality and BFS number from the register", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.municipality.name).toMatch(/Z[uü]rich/i);
    expect(result.municipality.bfs_number).toBe(261);
  });

  it("6417 Sattel is SZ, and the register says it also reaches into ZG", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "6417" })
    );
    expect(result.canton.code).toBe("SZ");
    expect(result.also_in_cantons).toContain("ZG");
  });

  it("rejects for the fictional PLZ 9998", async () => {
    await expect(
      handlePost("lookup_postcode", { postcode: "9998" })
    ).rejects.toThrow(/No Swiss postcode 9998/);
  });

  it("response is under 50K chars", async () => {
    const raw = await handlePost("lookup_postcode", { postcode: "8001" });
    expect(raw.length).toBeLessThan(50000);
  });

  it("source is swisstopo", async () => {
    const result = JSON.parse(
      await handlePost("lookup_postcode", { postcode: "8001" })
    );
    expect(result.source).toContain("swisstopo");
  });
});

// ── search_postcode ───────────────────────────────────────────────────────────

describe("search_postcode (live API)", () => {
  it("finds multiple PLZ entries for Zürich", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    expect(result.count).toBeGreaterThan(5); // Zürich has many districts
    expect(Array.isArray(result.results)).toBe(true);
    const codes = result.results.map((r: { postcode: number }) => r.postcode);
    expect(codes).toContain(8001);
  });

  it("each result has postcode and locality", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Bern" })
    );
    expect(result.count).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(typeof r.postcode).toBe("number");
      expect(typeof r.locality).toBe("string");
      expect(r.postcode).toBeGreaterThan(1000);
    }
  });

  it("finds Locarno", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Locarno" })
    );
    expect(result.count).toBeGreaterThan(0);
    const found = result.results.find(
      (r: { locality: string }) => r.locality.toLowerCase().includes("locarno")
    );
    expect(found).toBeDefined();
  });

  it("includes query in response", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Basel" })
    );
    expect(result.query).toBe("Basel");
  });

  it("returns empty for unknown place", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Xyznotacity123" })
    );
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("response is under 50K chars", async () => {
    const raw = await handlePost("search_postcode", { city_name: "Zürich" });
    expect(raw.length).toBeLessThan(50000);
  });

  it("postcodes are deduplicated", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    const codes = result.results.map((r: { postcode: number }) => r.postcode);
    expect(codes.length).toBe(new Set(codes).size);
  });

  it("labels Zürich results with canton ZH", async () => {
    const result = JSON.parse(
      await handlePost("search_postcode", { city_name: "Zürich" })
    );
    for (const r of result.results) {
      expect(r.canton).toBe("ZH");
    }
  });
});

// ── list_postcodes_in_canton ──────────────────────────────────────────────────

describe("list_postcodes_in_canton (live API)", () => {
  it("lists postcodes for ZH with count > 50", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    expect(result.canton.code).toBe("ZH");
    expect(result.count).toBeGreaterThan(50);
    expect(Array.isArray(result.postcodes)).toBe(true);
  });

  it("every postcode returned for ZG really is in ZG", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZG" })
    );
    // Zug is small and hemmed in by AG, LU, SZ and ZH; its own postcodes are
    // 6300–6345 plus Oberwil/Allenwinden. Nothing from a neighbour may appear.
    expect(result.count).toBeGreaterThan(10);
    expect(result.count).toBeLessThan(30);
    for (const entry of result.postcodes) {
      const check = JSON.parse(
        await handlePost("lookup_postcode", { postcode: String(entry.postcode) })
      );
      expect(check.canton.code).toBe("ZG");
    }
  }, 60_000);

  it("does not claim neighbouring postcodes for ZG", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZG" })
    );
    const codes = result.postcodes.map((p: { postcode: number }) => p.postcode);
    // 5642 Mühlau is AG, 6417 Sattel and 6418 Rothenthurm are SZ, 8910 Affoltern is ZH.
    expect(codes).not.toContain(5642);
    expect(codes).not.toContain(6417);
    expect(codes).not.toContain(6418);
    expect(codes).not.toContain(8910);
    expect(codes).toContain(6300);
  });

  it("postcodes that only reach into the canton are reported separately", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZG" })
    );
    const partly = result.partly_in_canton ?? [];
    for (const entry of partly) {
      expect(entry.main_canton).not.toBe("ZG");
      expect(entry.share_percent).toBeLessThan(50);
    }
    const codes = result.postcodes.map((p: { postcode: number }) => p.postcode);
    for (const entry of partly) expect(codes).not.toContain(entry.postcode);
  });

  it("every postcode returned for BS really is in BS", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "BS" })
    );
    for (const entry of result.postcodes) {
      const check = JSON.parse(
        await handlePost("lookup_postcode", { postcode: String(entry.postcode) })
      );
      expect(check.canton.code).toBe("BS");
    }
  }, 60_000);

  it("postcodes are sorted ascending", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "ZH" })
    );
    const codes = result.postcodes.map((p: { postcode: number }) => p.postcode);
    const sorted = [...codes].sort((a, b) => a - b);
    expect(codes).toEqual(sorted);
  });

  it("accepts full canton name Zürich", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "Zürich" })
    );
    expect(result.canton.code).toBe("ZH");
    expect(result.count).toBeGreaterThan(0);
  });

  it("accepts lowercase canton code", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "be" })
    );
    expect(result.canton.code).toBe("BE");
  });

  it("lists postcodes for small canton UR (Uri)", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "UR" })
    );
    expect(result.canton.code).toBe("UR");
    expect(result.count).toBeGreaterThan(0);
  });

  it("covers every canton, and the 26 lists do not overlap", async () => {
    const codes = [
      "ZH", "BE", "LU", "UR", "SZ", "OW", "NW", "GL", "ZG", "FR", "SO", "BS", "BL",
      "SH", "AR", "AI", "SG", "GR", "AG", "TG", "TI", "VD", "VS", "NE", "GE", "JU",
    ];
    const seen = new Map<number, string>();
    for (const code of codes) {
      const result = JSON.parse(await handlePost("list_postcodes_in_canton", { canton: code }));
      expect(result.count).toBeGreaterThan(0);
      for (const entry of result.postcodes) {
        expect(seen.has(entry.postcode)).toBe(false);
        seen.set(entry.postcode, code);
      }
    }
    expect(seen.size).toBeGreaterThan(3000);
  }, 60_000);

  it("response is under 50K chars for the largest canton", async () => {
    const raw = await handlePost("list_postcodes_in_canton", { canton: "BE" });
    expect(raw.length).toBeLessThan(50000);
  });

  it("includes source attribution", async () => {
    const result = JSON.parse(
      await handlePost("list_postcodes_in_canton", { canton: "GE" })
    );
    expect(result.source).toContain("swisstopo");
  });
});

// ── track_parcel ──────────────────────────────────────────────────────────────

describe("track_parcel (no live API — URL construction only)", () => {
  it("constructs correct tracking URL without network call", async () => {
    const result = JSON.parse(
      await handlePost("track_parcel", { tracking_number: "99.00.123456.12345678" })
    );
    expect(result.tracking_url).toBe(
      "https://service.post.ch/ekp-web/ui/entry/shipping/1/parcel/detail?parcelId=99.00.123456.12345678"
    );
    expect(result.tracking_number).toBe("99.00.123456.12345678");
    expect(result.note).toContain("Swiss Post does not provide a public tracking API");
    expect(result.formats).toBeTruthy();
  });

  it("URL-encodes tracking numbers with spaces", async () => {
    const result = JSON.parse(
      await handlePost("track_parcel", { tracking_number: "RI 123456789 CH" })
    );
    expect(result.tracking_url).toContain("RI%20123456789%20CH");
  });
});
