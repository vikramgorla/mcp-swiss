import { describe, it, expect, vi, afterEach } from "vitest";
import { handleMaplayers, maplayerTools } from "../../src/modules/maplayers.js";
import { mockCatalog, mockIdentify, mockFind, mockEmptyFeatures } from "../fixtures/maplayers.js";

function mockFetchJSON(...responses: unknown[]) {
  let callIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const data = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve(data),
      });
    })
  );
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

function fetchedUrl(): string {
  return String(vi.mocked(fetch).mock.calls[0][0]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const LAYER = "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill";

describe("maplayerTools", () => {
  it("exports 3 tools", () => {
    expect(maplayerTools.map((tool) => tool.name)).toEqual([
      "search_map_layers",
      "identify_map_layer",
      "find_map_features",
    ]);
  });

  it("requires identify and find inputs", () => {
    const identify = maplayerTools.find((tool) => tool.name === "identify_map_layer");
    const find = maplayerTools.find((tool) => tool.name === "find_map_features");
    expect(identify?.inputSchema.required).toEqual(["layer", "lat", "lng"]);
    expect(find?.inputSchema.required).toEqual(["layer", "search_field", "search_text"]);
  });
});

describe("search_map_layers", () => {
  it("matches every query token and returns slim layers", async () => {
    mockFetchJSON(mockCatalog);
    const result = JSON.parse(
      await handleMaplayers("search_map_layers", { query: "municipal boundaries" })
    );
    expect(result.total_matches).toBe(1);
    expect(result.layers[0].layer_id).toBe(LAYER);
    expect(result.layers[0].owner).toBe("swisstopo");
    expect(result.layers[0].abstract).toContain("historical");
    expect(result.source).toContain("geo.admin.ch");
    expect(fetchedUrl()).toContain("/rest/services/ech/MapServer");
  });

  it("filters by data owner", async () => {
    mockFetchJSON(mockCatalog);
    const result = JSON.parse(await handleMaplayers("search_map_layers", { owner: "bafu" }));
    expect(result.returned).toBe(1);
    expect(result.layers[0].layer_id).toContain("bafu");
  });

  it("lists layers when no query is given", async () => {
    mockFetchJSON(mockCatalog);
    const result = JSON.parse(await handleMaplayers("search_map_layers", { limit: 2 }));
    expect(result.total_matches).toBe(3);
    expect(result.returned).toBe(2);
    expect(result.layers[0].name.localeCompare(result.layers[1].name)).toBeLessThanOrEqual(0);
  });

  it("returns no matches for an unknown query", async () => {
    mockFetchJSON(mockCatalog);
    const result = JSON.parse(await handleMaplayers("search_map_layers", { query: "zzzz-not-a-layer" }));
    expect(result.total_matches).toBe(0);
    expect(result.layers).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    mockFetchError(502);
    await expect(handleMaplayers("search_map_layers", { query: "bern" })).rejects.toThrow("HTTP 502");
  });
});

describe("identify_map_layer", () => {
  it("keeps the current feature and drops bulky attributes", async () => {
    mockFetchJSON(mockIdentify);
    const result = JSON.parse(
      await handleMaplayers("identify_map_layer", { layer: LAYER, lat: 46.948, lng: 7.4474 })
    );
    expect(result.returned).toBe(1);
    expect(result.current_only).toBe(true);
    expect(result.total_matches).toBe(2);
    expect(result.results[0].attributes.gemname).toBe("Bern");
    expect(result.results[0].attributes.jahr).toBe(2026);
    expect(result.results[0].attributes.link_en).toBeUndefined();
    expect(result.results[0].attributes.note).toBeUndefined();
  });

  it("can include historical features", async () => {
    mockFetchJSON(mockIdentify);
    const result = JSON.parse(
      await handleMaplayers("identify_map_layer", {
        layer: LAYER,
        lat: 46.948,
        lng: 7.4474,
        include_historical: true,
        limit: 1,
      })
    );
    expect(result.current_only).toBeUndefined();
    expect(result.returned).toBe(1);
    expect(result.results[0].feature_id).toBe("16401-1850");
  });

  it("builds an ech identify request", async () => {
    mockFetchJSON(mockEmptyFeatures);
    await handleMaplayers("identify_map_layer", {
      layer: LAYER,
      lat: "46.948",
      lng: "7.4474",
      tolerance: 0,
      lang: "de",
    });
    const url = fetchedUrl();
    expect(url).toContain("/ech/MapServer/identify?");
    expect(url).toContain("geometry=7.4474%2C46.948");
    expect(url).toContain(`layers=all%3A${encodeURIComponent(LAYER)}`);
    expect(url).toContain("sr=4326");
    expect(url).toContain("returnGeometry=false");
    expect(url).toContain("lang=de");
    expect(url).toContain("tolerance=0");
  });

  it("rejects missing or invalid coordinates", async () => {
    await expect(handleMaplayers("identify_map_layer", { lat: 46.9, lng: 7.4 })).rejects.toThrow(
      "layer is required"
    );
    await expect(
      handleMaplayers("identify_map_layer", { layer: LAYER, lat: 120, lng: 7.4 })
    ).rejects.toThrow("lat must be a number");
    await expect(
      handleMaplayers("identify_map_layer", { layer: "bad layer", lat: 46.9, lng: 7.4 })
    ).rejects.toThrow("layer must be a geo.admin layer id");
  });

  it("returns an empty result list", async () => {
    mockFetchJSON(mockEmptyFeatures);
    const result = JSON.parse(
      await handleMaplayers("identify_map_layer", { layer: LAYER, lat: 46.9, lng: 7.4 })
    );
    expect(result.returned).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    mockFetchError(404);
    await expect(
      handleMaplayers("identify_map_layer", { layer: LAYER, lat: 46.9, lng: 7.4 })
    ).rejects.toThrow("HTTP 404");
  });
});

describe("find_map_features", () => {
  it("returns the current match by default", async () => {
    mockFetchJSON(mockFind);
    const result = JSON.parse(
      await handleMaplayers("find_map_features", {
        layer: LAYER,
        search_field: "gemname",
        search_text: "Bern",
        contains: false,
      })
    );
    expect(result.returned).toBe(1);
    expect(result.current_only).toBe(true);
    expect(result.results[0].attributes.jahr).toBe(2026);
    expect(result.contains).toBe(false);
  });

  it("builds an ech find request", async () => {
    mockFetchJSON(mockEmptyFeatures);
    await handleMaplayers("find_map_features", {
      layer: LAYER,
      search_field: "gemname",
      search_text: "Bern",
    });
    const url = fetchedUrl();
    expect(url).toContain("/ech/MapServer/find?");
    expect(url).toContain("searchField=gemname");
    expect(url).toContain("searchText=Bern");
    expect(url).toContain("contains=true");
    expect(url).toContain("returnGeometry=false");
  });

  it("rejects a missing search field", async () => {
    await expect(
      handleMaplayers("find_map_features", { layer: LAYER, search_text: "Bern" })
    ).rejects.toThrow("search_field is required");
    await expect(
      handleMaplayers("find_map_features", { layer: LAYER, search_field: "gem name", search_text: "Bern" })
    ).rejects.toThrow("search_field must be an attribute name");
  });
});

describe("unknown map layer tool", () => {
  it("throws for an unrecognized tool name", async () => {
    await expect(handleMaplayers("nope", {})).rejects.toThrow("Unknown map layer tool: nope");
  });
});
