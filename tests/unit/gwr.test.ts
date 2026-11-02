import { describe, it, expect, vi, afterEach } from "vitest";
import {
  handleGwr,
  gwrTools,
  decodeFloor,
  toIsoDate,
  haversineMetres,
} from "../../src/modules/gwr.js";
import {
  townHallFind,
  multiEntranceFind,
  emptyFind,
  featureSearch,
  emptySearch,
  batchFeatures,
  identifyNear,
} from "../fixtures/gwr.js";

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchJSON(...responses: unknown[]) {
  let callIndex = 0;
  const fn = vi.fn().mockImplementation(() => {
    const data = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(data),
    });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    })
  );
}

function calledUrl(fn: ReturnType<typeof vi.fn>, i = 0): URL {
  return new URL(fn.mock.calls[i][0] as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tool definitions ──────────────────────────────────────────────────────────

describe("gwrTools", () => {
  it("exports 3 tools", () => {
    expect(gwrTools).toHaveLength(3);
    expect(gwrTools.map((t) => t.name)).toEqual([
      "search_buildings",
      "get_building",
      "buildings_near",
    ]);
  });

  it("declares required params", () => {
    const req = Object.fromEntries(gwrTools.map((t) => [t.name, t.inputSchema.required]));
    expect(req.search_buildings).toEqual(["address"]);
    expect(req.get_building).toEqual(["egid"]);
    expect(req.buildings_near).toEqual(["lat", "lon"]);
  });

  it("rejects unknown tool names", async () => {
    await expect(handleGwr("nope", {})).rejects.toThrow("Unknown GWR tool: nope");
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

describe("helpers", () => {
  it("decodeFloor handles ground floor, floors, basements and unknown", () => {
    expect(decodeFloor(3100)).toBe("Ground floor");
    expect(decodeFloor(3103)).toBe("Floor 3");
    expect(decodeFloor(3402)).toBe("Basement 2");
    expect(decodeFloor(1234)).toBe("Unknown code 1234");
    expect(decodeFloor(null)).toBeNull();
    expect(decodeFloor(undefined)).toBeNull();
  });

  it("toIsoDate converts dd.mm.yyyy and rejects junk", () => {
    expect(toIsoDate("29.11.2001")).toBe("2001-11-29");
    expect(toIsoDate("-")).toBeNull();
    expect(toIsoDate("")).toBeNull();
    expect(toIsoDate(null)).toBeNull();
  });

  it("haversineMetres is ~0 for identical points and ~111 km per degree of latitude", () => {
    expect(haversineMetres(46.5, 6.6, 46.5, 6.6)).toBe(0);
    expect(haversineMetres(46, 7, 47, 7)).toBeGreaterThan(110000);
    expect(haversineMetres(46, 7, 47, 7)).toBeLessThan(112500);
  });
});

// ── search_buildings ──────────────────────────────────────────────────────────

describe("search_buildings", () => {
  it("searches the GWR layer and enriches hits with one batched feature call", async () => {
    const fn = mockFetchJSON(featureSearch, batchFeatures);
    const result = JSON.parse(
      await handleGwr("search_buildings", { address: "Place de la Palud Lausanne" })
    );

    const search = calledUrl(fn, 0);
    expect(search.pathname).toContain("/SearchServer");
    expect(search.searchParams.get("type")).toBe("featuresearch");
    expect(search.searchParams.get("features")).toBe("ch.bfs.gebaeude_wohnungs_register");
    expect(search.searchParams.get("searchText")).toBe("Place de la Palud Lausanne");
    expect(search.searchParams.get("limit")).toBe("5");

    const batch = calledUrl(fn, 1);
    expect(decodeURIComponent(batch.pathname)).toMatch(
      /ch\.bfs\.gebaeude_wohnungs_register\/2119257_0,882682_0,882683_0$/
    );
    expect(batch.searchParams.get("returnGeometry")).toBe("false");

    expect(result.count).toBe(3); // other-layer hit dropped
    const [hall, palud20, fallback] = result.buildings;
    expect(hall).toMatchObject({
      egid: 2119257,
      address: "Place de la Palud 2, 1003 Lausanne",
      name: "Hôtel Seigneux (Hôtel de Ville)",
      municipality: "Lausanne",
      canton: "VD",
      category: "Non-residential",
      class: "Office building",
      status: "Existing",
      construction_year: 1700,
      construction_period: "Before 1919",
      floors: 5,
      dwellings: null,
      lat: 46.521793,
      lon: 6.632926,
    });
    expect(palud20.name).toBeUndefined(); // empty gbez omitted
    expect(palud20.class).toBe("Building with three or more dwellings");
    expect(palud20.dwellings).toBe(3);
    expect(fallback).toEqual({
      egid: 882683,
      address: "Place de la Palud 21 1003 Lausanne",
      lat: null,
      lon: null,
    });
    expect(result.source).toContain("GWR");
  });

  it("caps limit at 20 and floors it at 1", async () => {
    let fn = mockFetchJSON(emptySearch);
    await handleGwr("search_buildings", { address: "x", limit: 999 });
    expect(calledUrl(fn).searchParams.get("limit")).toBe("20");

    fn = mockFetchJSON(emptySearch);
    await handleGwr("search_buildings", { address: "x", limit: -3 });
    expect(calledUrl(fn).searchParams.get("limit")).toBe("1");

    fn = mockFetchJSON(emptySearch);
    await handleGwr("search_buildings", { address: "x", limit: "abc" });
    expect(calledUrl(fn).searchParams.get("limit")).toBe("5");
  });

  it("slices hits to the limit", async () => {
    mockFetchJSON(featureSearch, batchFeatures);
    const result = JSON.parse(await handleGwr("search_buildings", { address: "Palud", limit: 1 }));
    expect(result.count).toBe(1);
    expect(result.buildings[0].egid).toBe(2119257);
  });

  it("returns an empty list without a second call when nothing matches", async () => {
    const fn = mockFetchJSON(emptySearch);
    const result = JSON.parse(await handleGwr("search_buildings", { address: "Nowhere 999" }));
    expect(result).toMatchObject({ query: "Nowhere 999", count: 0, buildings: [] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("tolerates missing results/features arrays", async () => {
    mockFetchJSON({}, {});
    const empty = JSON.parse(await handleGwr("search_buildings", { address: "x" }));
    expect(empty.count).toBe(0);

    mockFetchJSON({ results: [{ attrs: { featureId: "5_0" } }] }, {});
    const result = JSON.parse(await handleGwr("search_buildings", { address: "x" }));
    expect(result.buildings[0]).toEqual({ egid: 5, address: "", lat: null, lon: null });
  });

  it("requires address", async () => {
    await expect(handleGwr("search_buildings", {})).rejects.toThrow("address is required");
    await expect(handleGwr("search_buildings", { address: "   " })).rejects.toThrow("address is required");
  });

  it("propagates HTTP errors", async () => {
    mockFetchError(500);
    await expect(handleGwr("search_buildings", { address: "x" })).rejects.toThrow("HTTP 500");
  });
});

// ── get_building ──────────────────────────────────────────────────────────────

describe("get_building", () => {
  it("queries find by exact EGID in WGS84", async () => {
    const fn = mockFetchJSON(townHallFind);
    await handleGwr("get_building", { egid: 2119257 });
    const url = calledUrl(fn);
    expect(url.pathname).toMatch(/\/MapServer\/find$/);
    expect(url.searchParams.get("layer")).toBe("ch.bfs.gebaeude_wohnungs_register");
    expect(url.searchParams.get("searchField")).toBe("egid");
    expect(url.searchParams.get("searchText")).toBe("2119257");
    expect(url.searchParams.get("contains")).toBe("false");
    expect(url.searchParams.get("sr")).toBe("4326");
  });

  it("decodes a non-residential building without dwellings", async () => {
    mockFetchJSON(townHallFind);
    const r = JSON.parse(await handleGwr("get_building", { egid: "2119257" }));
    expect(r).toMatchObject({
      egid: 2119257,
      name: "Hôtel Seigneux (Hôtel de Ville)",
      address: "Place de la Palud 2, 1003 Lausanne",
      municipality: "Lausanne",
      bfs_municipality_number: 5586,
      canton: "VD",
      coordinates: { lat: 46.521793, lon: 6.632926, lv95_e: 2538173.654, lv95_n: 1152588.099 },
      category: "Non-residential",
      class: "Office building",
      status: "Existing",
      construction_year: 1700,
      construction_period: "Before 1919",
      floors: 5,
      footprint_area_m2: 1095,
      parcel: { number: "10071", egrid: "CH907857723624", official_building_number: "5466" },
      dwellings_summary: { count: 0, listed: 0, total_rooms: null, total_area_m2: null },
      dwellings: [],
      data_as_of: "2026-09-17",
    });
    expect(r.heating).toEqual([
      {
        generator: "Heat exchanger incl. district heating (single building)",
        energy_source: "District heating (generic)",
        updated: "2001-11-29",
      },
    ]);
    // second hot-water slot (no generator / no energy) is dropped
    expect(r.hot_water).toEqual([
      { generator: "Central electric water heater", energy_source: "Electricity", updated: "2001-11-29" },
    ]);
    expect(r.dwellings_truncated).toBeUndefined();
  });

  it("merges entrances, sorts them, ignores other EGIDs and lists dwellings", async () => {
    mockFetchJSON(multiEntranceFind);
    const r = JSON.parse(await handleGwr("get_building", { egid: 882657 }));
    expect(r.entrances.map((e: { edid: number }) => e.edid)).toEqual([0, 1, 2]);
    expect(r.entrances[1]).toEqual({
      edid: 1,
      address: "Rue Saint-Laurent 6, 1003 Lausanne",
      lat: 46.522459,
      lon: 6.632012,
    });
    expect(r.address).toBe("Place Marc-Louis-Arlaud 1, 1003 Lausanne");
    expect(r.coordinates.lat).toBe(46.522588);
    expect(r.construction_period).toBe("Unknown code 9999");
    expect(r.heating).toEqual([]);
    expect(r.hot_water).toEqual([]);
    expect(r.data_as_of).toBeNull();
    expect(r.name).toBeNull();

    expect(r.dwellings.map((d: { ewid: number }) => d.ewid)).toEqual([1, 2, 3]);
    expect(r.dwellings[0]).toEqual({
      ewid: 1,
      admin_number: "101",
      floor: "Floor 1",
      location: null,
      rooms: 3,
      area_m2: 79,
      kitchen: true,
      multi_floor: false,
      construction_year: 1999,
      status: "Existing",
    });
    expect(r.dwellings[2].floor).toBe("Floor 50");
    expect(r.dwellings_summary).toEqual({ count: 3, listed: 3, total_rooms: 8, total_area_m2: 212 });
  });

  it("decodes dwelling edge cases (ground floor, basement, nulls, unknown status)", async () => {
    const { paludTwentyAttrs } = await import("../fixtures/gwr.js");
    mockFetchJSON({
      results: [{ featureId: "882682_0", geometry: { x: 6.633116, y: 46.521941 }, attributes: paludTwentyAttrs }],
    });
    const r = JSON.parse(await handleGwr("get_building", { egid: 882682 }));
    const [d1, d2, d3] = r.dwellings;
    expect(d1).toMatchObject({ floor: "Floor 2", location: "gauche", kitchen: true, multi_floor: false });
    expect(d2).toMatchObject({ floor: "Ground floor", location: null, kitchen: false, multi_floor: true });
    expect(d3).toMatchObject({
      admin_number: null,
      floor: "Basement 1",
      rooms: null,
      area_m2: null,
      kitchen: null,
      multi_floor: null,
      construction_year: null,
      status: "Unknown code 3099",
    });
    expect(r.heating).toEqual([
      { generator: "Boiler (single building)", energy_source: "Gas", updated: "2001-11-29" },
    ]);
    expect(r.dwellings_summary.total_rooms).toBe(3);
  });

  it("honours max_dwellings including 0 (summary only)", async () => {
    mockFetchJSON(multiEntranceFind);
    const r = JSON.parse(await handleGwr("get_building", { egid: 882657, max_dwellings: 1 }));
    expect(r.dwellings).toHaveLength(1);
    expect(r.dwellings_truncated).toBe(true);

    mockFetchJSON(multiEntranceFind);
    const r0 = JSON.parse(await handleGwr("get_building", { egid: 882657, max_dwellings: 0 }));
    expect(r0.dwellings).toEqual([]);
    expect(r0.dwellings_summary.listed).toBe(3);
  });

  it("handles entrances without geometry or edid", async () => {
    const { townHallAttrs } = await import("../fixtures/gwr.js");
    const attrs = { ...townHallAttrs, edid: undefined, dplz4: null, dplzname: null, strname_deinr: "", label: "Somewhere 1" };
    mockFetchJSON({
      results: [
        { featureId: "2119257_0", attributes: attrs },
        { featureId: "2119257_1", attributes: { ...attrs } },
      ],
    });
    const r = JSON.parse(await handleGwr("get_building", { egid: 2119257 }));
    expect(r.coordinates.lat).toBeNull();
    expect(r.coordinates.lon).toBeNull();
    expect(r.entrances[0]).toEqual({ edid: 0, address: "Somewhere 1" });
  });

  it("fills nulls for missing optional attributes", async () => {
    mockFetchJSON({
      results: [{ featureId: "7_0", geometry: { x: 7, y: 46 }, attributes: { egid: "7" } }],
    });
    const r = JSON.parse(await handleGwr("get_building", { egid: 7 }));
    expect(r).toMatchObject({
      egid: 7,
      address: "",
      municipality: null,
      canton: null,
      category: null,
      construction_year: null,
      parcel: { number: null, egrid: null, official_building_number: null },
      dwellings_summary: { count: 0 },
    });
  });

  it("throws when the EGID is not in the register", async () => {
    mockFetchJSON(emptyFind);
    await expect(handleGwr("get_building", { egid: 123 })).rejects.toThrow(
      "No building found in the GWR with EGID 123"
    );
    mockFetchJSON({});
    await expect(handleGwr("get_building", { egid: 123 })).rejects.toThrow("No building found");
  });

  it("validates egid", async () => {
    for (const egid of [undefined, "", "abc", 0, -5, 1.5, "1234567890", {}]) {
      await expect(handleGwr("get_building", { egid })).rejects.toThrow("egid must be a positive integer");
    }
  });

  it("normalises leading zeros", async () => {
    const fn = mockFetchJSON(townHallFind);
    await handleGwr("get_building", { egid: "002119257" });
    expect(calledUrl(fn).searchParams.get("searchText")).toBe("2119257");
  });

  it("propagates HTTP errors", async () => {
    mockFetchError(503);
    await expect(handleGwr("get_building", { egid: 1 })).rejects.toThrow("HTTP 503");
  });
});

// ── buildings_near ────────────────────────────────────────────────────────────

describe("buildings_near", () => {
  const center = { lat: 46.521793, lon: 6.632926 };

  it("queries identify with a WGS84 envelope around the point", async () => {
    const fn = mockFetchJSON(identifyNear);
    await handleGwr("buildings_near", { ...center, radius: 60 });
    const url = calledUrl(fn);
    expect(url.pathname).toMatch(/\/MapServer\/identify$/);
    expect(url.searchParams.get("layers")).toBe("all:ch.bfs.gebaeude_wohnungs_register");
    expect(url.searchParams.get("geometryType")).toBe("esriGeometryEnvelope");
    expect(url.searchParams.get("sr")).toBe("4326");
    const [minX, minY, maxX, maxY] = url.searchParams.get("geometry")!.split(",").map(Number);
    expect(minX).toBeLessThan(center.lon);
    expect(maxX).toBeGreaterThan(center.lon);
    expect(minY).toBeLessThan(center.lat);
    expect(maxY).toBeGreaterThan(center.lat);
    expect(maxY - minY).toBeCloseTo((2 * 60) / 111320, 6);
  });

  it("filters by circular radius, dedupes entrances and sorts by distance", async () => {
    mockFetchJSON(identifyNear);
    const r = JSON.parse(await handleGwr("buildings_near", { ...center, radius: 60 }));
    expect(r.radius_m).toBe(60);
    expect(r.count).toBe(2);
    expect(r.total_in_radius).toBe(2);
    expect(r.buildings.map((b: { egid: number }) => b.egid)).toEqual([2119257, 882682]);
    expect(r.buildings[0].distance_m).toBe(0);
    expect(r.buildings[1].distance_m).toBeGreaterThan(15);
    expect(r.buildings[1].distance_m).toBeLessThan(30);
    expect(r.buildings[1]).toMatchObject({ lat: 46.521941, lon: 6.633116, class: "Building with three or more dwellings" });
    expect(r.note).toBeUndefined();
  });

  it("applies default radius/limit and caps them", async () => {
    mockFetchJSON(identifyNear);
    const r = JSON.parse(await handleGwr("buildings_near", center));
    expect(r.radius_m).toBe(50);

    mockFetchJSON(identifyNear);
    const capped = JSON.parse(await handleGwr("buildings_near", { ...center, radius: 10000, limit: 1 }));
    expect(capped.radius_m).toBe(250);
    expect(capped.count).toBe(1);
    expect(capped.total_in_radius).toBe(3);
  });

  it("adds a note when the upstream result cap is hit", async () => {
    const many = {
      results: Array.from({ length: 200 }, (_, i) => ({
        featureId: `${i}_0`,
        geometry: { x: center.lon, y: center.lat },
        attributes: { egid: String(i + 1) },
      })),
    };
    mockFetchJSON(many);
    const r = JSON.parse(await handleGwr("buildings_near", { ...center, limit: 50 }));
    expect(r.count).toBe(50);
    expect(r.total_in_radius).toBe(200);
    expect(r.note).toMatch(/reduce the radius/);
  });

  it("handles an empty response", async () => {
    mockFetchJSON({});
    const r = JSON.parse(await handleGwr("buildings_near", center));
    expect(r.count).toBe(0);
    expect(r.buildings).toEqual([]);
  });

  it("validates coordinates", async () => {
    await expect(handleGwr("buildings_near", {})).rejects.toThrow("lat and lon are required");
    await expect(handleGwr("buildings_near", { lat: 46.5 })).rejects.toThrow("lat and lon are required");
    await expect(handleGwr("buildings_near", { lat: "x", lon: 6.6 })).rejects.toThrow("inside Switzerland");
    await expect(handleGwr("buildings_near", { lat: 48.9, lon: 2.35 })).rejects.toThrow("inside Switzerland");
    await expect(handleGwr("buildings_near", { lat: 46.5, lon: 11 })).rejects.toThrow("inside Switzerland");
  });

  it("propagates HTTP errors", async () => {
    mockFetchError(502);
    await expect(handleGwr("buildings_near", center)).rejects.toThrow("HTTP 502");
  });
});
