import { describe, it, expect, vi, afterEach } from "vitest";
import { handleAvalanche, avalancheTools, SWISS_AVALANCHE_REGIONS } from "../../src/modules/avalanche.js";
import {
  winterBulletins,
  springBulletin,
  winterGeojson,
  emptyBulletins,
  emptyGeojson,
  bulletinList,
} from "../fixtures/avalanche.js";

/** Answers each request in turn; the last response repeats. */
function mockFetch(...responses: unknown[]) {
  const urls: string[] = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      urls.push(url);
      const data = responses[i] ?? responses[responses.length - 1];
      i++;
      return Promise.resolve({ ok: true, status: 200, statusText: "OK", json: () => Promise.resolve(data) });
    })
  );
  return urls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tool definitions ──────────────────────────────────────────────────────────

describe("avalancheTools", () => {
  it("exports both tools with object schemas", () => {
    expect(avalancheTools).toHaveLength(2);
    for (const tool of avalancheTools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it("describes live danger levels rather than links", () => {
    const tool = avalancheTools.find((t) => t.name === "get_avalanche_bulletin");
    expect(tool?.description).toMatch(/danger level/i);
    expect(tool?.description).not.toMatch(/\blinks?\b/i);
  });

  it("takes region, coordinates, language and date", () => {
    const tool = avalancheTools.find((t) => t.name === "get_avalanche_bulletin");
    expect(Object.keys(tool!.inputSchema.properties)).toEqual(["region", "lat", "lon", "language", "date"]);
    const language = tool!.inputSchema.properties.language as { enum: string[] };
    expect(language.enum).toEqual(["de", "en", "fr", "it"]);
  });

  it("list_avalanche_regions takes search and canton", () => {
    const tool = avalancheTools.find((t) => t.name === "list_avalanche_regions");
    expect(tool?.inputSchema.properties).toHaveProperty("search");
    expect(tool?.inputSchema.properties).toHaveProperty("canton");
  });

  it("neither tool requires an argument", () => {
    for (const tool of avalancheTools) {
      expect((tool.inputSchema as { required?: string[] }).required ?? []).toHaveLength(0);
    }
  });
});

// ── Warning regions ───────────────────────────────────────────────────────────

describe("SWISS_AVALANCHE_REGIONS", () => {
  it("holds the 135 EAWS micro-regions SLF issues bulletins for", () => {
    expect(SWISS_AVALANCHE_REGIONS).toHaveLength(135);
  });

  it("uses four-digit EAWS ids, unique, with a name", () => {
    const ids = SWISS_AVALANCHE_REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const region of SWISS_AVALANCHE_REGIONS) {
      expect(region.id).toMatch(/^CH-\d{4}$/);
      expect(region.name).toBeTruthy();
    }
  });

  it("carries a canton everywhere except Liechtenstein", () => {
    const without = SWISS_AVALANCHE_REGIONS.filter((r) => r.canton === null);
    expect(without.map((r) => r.id)).toEqual(["CH-3311"]);
    for (const region of SWISS_AVALANCHE_REGIONS) {
      if (region.canton !== null) expect(region.canton).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("includes regions the bulletin actually names", () => {
    const byId = new Map(SWISS_AVALANCHE_REGIONS.map((r) => [r.id, r.name]));
    expect(byId.get("CH-5123")).toBe("Davos");
    expect(byId.get("CH-4222")).toBe("Zermatt");
    expect(byId.get("CH-7114")).toBe("St. Moritz");
  });
});

// ── get_avalanche_bulletin, in season ─────────────────────────────────────────

describe("get_avalanche_bulletin in season", () => {
  it("returns the danger level and problems for a region id", async () => {
    mockFetch(winterBulletins);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "CH-5123" }));

    expect(result.bulletin_in_force).toBe(true);
    expect(result.region).toEqual({ id: "CH-5123", name: "Davos", canton: "GR" });
    expect(result.danger.level).toBe(3);
    expect(result.danger.label).toBe("considerable");
    expect(result.danger.within_level).toBe("neutral");
    expect(result.problems[0].type).toBe("persistent_weak_layers");
    expect(result.problems[0].elevation).toBe("above 2200 m");
    expect(result.problems[0].aspects).toContain("NE");
    expect(result.valid).toEqual({ startTime: "2026-02-10T07:00:00Z", endTime: "2026-02-10T16:00:00Z" });
    expect(result.source.provider).toContain("SLF");
  });

  it("matches a region by name, case-insensitively", async () => {
    mockFetch(winterBulletins);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "davos" }));
    expect(result.region.id).toBe("CH-5123");
  });

  it("picks the bulletin the region belongs to, not the first one", async () => {
    mockFetch(winterBulletins);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "CH-7114" }));
    expect(result.danger.within_level).toBe("plus");
    expect(result.problems[0].elevation).toBe("above 2000 m");
    expect(result.covers_regions).toContain("CH-7114");
  });

  it("strips HTML out of the advice and summary texts", async () => {
    mockFetch(winterBulletins);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "CH-5123" }));
    for (const text of [result.snowpack, result.weather_outlook, result.tendency, result.problems[0].advice]) {
      expect(text).toBeTruthy();
      expect(text).not.toMatch(/[<>]/);
    }
    expect(result.snowpack.startsWith("Snowpack: ")).toBe(true);
  });

  it("reports both periods when the danger changes during the day", async () => {
    mockFetch(springBulletin);
    const region = springBulletin.bulletins[0].regions[0].regionID;
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region }));

    expect(result.danger.period).toBe("all_day");
    expect(result.danger_by_period).toHaveLength(2);
    expect(result.danger_by_period.map((d: { period: string }) => d.period)).toEqual(["all_day", "later"]);
    expect(result.danger_by_period[1].level).toBe(3);
  });

  it("summarises the whole country when no region is given", async () => {
    mockFetch(winterBulletins);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));

    expect(result.scope).toBe("Switzerland");
    expect(result.areas).toHaveLength(2);
    expect(result.areas[0].danger[0].level).toBe(3);
    expect(result.areas[0].regions[0]).toHaveProperty("id");
    // no prose in the overview
    expect(result.snowpack).toBeUndefined();
  });

  it("resolves a coordinate through the geojson outlines", async () => {
    const urls = mockFetch(winterGeojson);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { lat: 46.02, lon: 7.749 }));

    expect(urls[0]).toContain("/geojson");
    expect(result.bulletin_in_force).toBe(true);
    expect(result.point).toEqual({ lat: 46.02, lon: 7.749 });
    expect(result.danger.level).toBe(3);
    expect(result.covers_regions).toContain("CH-4222");
  });

  it("says so when a coordinate falls outside every warning region", async () => {
    mockFetch(winterGeojson);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { lat: 46.801, lon: 9.836 }));
    expect(result.note).toContain("No warning region covers");
  });

  it("passes the requested language and date to the API", async () => {
    const urls = mockFetch(winterBulletins);
    await handleAvalanche("get_avalanche_bulletin", { region: "CH-5123", language: "de", date: "2026-02-10" });
    expect(urls[0]).toContain("/caaml/de/json");
    expect(urls[0]).toContain("activeAt=2026-02-10T11%3A00%3A00Z");
  });

  it("falls back to English for an unsupported language", async () => {
    const urls = mockFetch(winterBulletins);
    await handleAvalanche("get_avalanche_bulletin", { language: "es" });
    expect(urls[0]).toContain("/caaml/en/json");
  });

  it("stays well under the response size budget", async () => {
    mockFetch(winterBulletins);
    const raw = await handleAvalanche("get_avalanche_bulletin", {});
    expect(raw.length).toBeLessThan(50000);
  });
});

// ── get_avalanche_bulletin, out of season ─────────────────────────────────────

describe("get_avalanche_bulletin out of season", () => {
  it("reports no bulletin in force instead of failing", async () => {
    mockFetch(emptyBulletins, bulletinList);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));

    expect(result.bulletin_in_force).toBe(false);
    expect(result.season).toMatch(/winter season/i);
    expect(result.last_bulletin).toEqual({
      published: "2026-05-17T15:00:00Z",
      valid_until: "2026-05-18T15:00:00Z",
    });
    expect(result.source.pdf).toContain("aws.slf.ch");
  });

  it("echoes what was asked for", async () => {
    mockFetch(emptyBulletins, bulletinList);
    const result = JSON.parse(
      await handleAvalanche("get_avalanche_bulletin", { region: "CH-5123", date: "2026-08-01" })
    );
    expect(result.bulletin_in_force).toBe(false);
    expect(result.requested.region).toBe("CH-5123");
    expect(result.requested.date).toBe("2026-08-01");
  });

  it("handles an empty geojson for a coordinate the same way", async () => {
    mockFetch(emptyGeojson, bulletinList);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { lat: 46.02, lon: 7.749 }));
    expect(result.bulletin_in_force).toBe(false);
    expect(result.requested.lat).toBe(46.02);
  });

  it("still answers when the bulletin list is unavailable", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        call++;
        if (call === 1) {
          return Promise.resolve({ ok: true, status: 200, statusText: "OK", json: () => Promise.resolve(emptyBulletins) });
        }
        return Promise.resolve({ ok: false, status: 503, statusText: "Service Unavailable", json: () => Promise.resolve({}) });
      })
    );
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", {}));
    expect(result.bulletin_in_force).toBe(false);
    expect(result.last_bulletin).toBeUndefined();
  });

  it("explains a region that is in the list but not in today's bulletin", async () => {
    mockFetch(winterBulletins, bulletinList);
    const result = JSON.parse(await handleAvalanche("get_avalanche_bulletin", { region: "CH-8111" }));
    expect(result.bulletin_in_force).toBe(false);
    expect(result.note).toContain("CH-8111");
  });
});

// ── Argument handling ─────────────────────────────────────────────────────────

describe("argument handling", () => {
  it("rejects an unknown region without calling the API", async () => {
    const urls = mockFetch(winterBulletins);
    // A lookup failure has to reach the client as isError, not as a result
    // object the agent would read as data.
    await expect(
      handleAvalanche("get_avalanche_bulletin", { region: "Mordor" })
    ).rejects.toThrow(/Mordor.*list_avalanche_regions/);
    expect(urls).toHaveLength(0);
  });

  it("rejects a lone coordinate", async () => {
    mockFetch(winterBulletins);
    await expect(handleAvalanche("get_avalanche_bulletin", { lat: 46.02 })).rejects.toThrow(
      "lat and lon must be given together"
    );
  });

  it("rejects a coordinate that is not a number", async () => {
    mockFetch(winterBulletins);
    await expect(handleAvalanche("get_avalanche_bulletin", { lat: "north", lon: 7.7 })).rejects.toThrow(
      "lat and lon must be numbers"
    );
  });

  it("rejects an unparseable date", async () => {
    mockFetch(winterBulletins);
    await expect(handleAvalanche("get_avalanche_bulletin", { date: "last winter" })).rejects.toThrow("Invalid date");
  });

  it("throws for an unknown tool name", async () => {
    await expect(handleAvalanche("does_not_exist", {})).rejects.toThrow("Unknown avalanche tool: does_not_exist");
  });
});

// ── list_avalanche_regions ────────────────────────────────────────────────────

describe("list_avalanche_regions", () => {
  it("lists every region without a filter, without any network call", async () => {
    const urls = mockFetch({});
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", {}));
    expect(result.count).toBe(135);
    expect(result.total).toBe(135);
    expect(result.regions).toHaveLength(135);
    expect(urls).toHaveLength(0);
  });

  it("filters by canton on an exact code", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "gr" }));
    expect(result.count).toBeGreaterThan(30);
    expect(result.count).toBeLessThan(result.total);
    for (const region of result.regions) expect(region.canton).toBe("GR");
  });

  it("searches on id and on name", async () => {
    const byName = JSON.parse(await handleAvalanche("list_avalanche_regions", { search: "zermatt" }));
    expect(byName.regions).toEqual([{ id: "CH-4222", name: "Zermatt", canton: "VS" }]);

    const byId = JSON.parse(await handleAvalanche("list_avalanche_regions", { search: "CH-71" }));
    expect(byId.count).toBeGreaterThan(1);
    for (const region of byId.regions) expect(region.id.startsWith("CH-71")).toBe(true);
  });

  it("combines canton and search", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "TI", search: "leventina" }));
    expect(result.count).toBe(2);
  });

  it("returns an empty list for a canton with no regions", async () => {
    const result = JSON.parse(await handleAvalanche("list_avalanche_regions", { canton: "BS" }));
    expect(result.count).toBe(0);
    expect(result.total).toBe(135);
  });

  it("stays compact", async () => {
    const raw = await handleAvalanche("list_avalanche_regions", {});
    expect(raw.length).toBeLessThan(12000);
  });
});
