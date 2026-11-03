import { describe, it, expect, vi, afterEach } from "vitest";
import { handleOpendata, opendataTools } from "../../src/modules/opendata.js";
import {
  mockSearchResponse,
  mockEmptySearch,
  mockFailedSearch,
  mockPackage,
  mockPackageNoResources,
  mockNotFound,
} from "../fixtures/opendata.js";

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

function mockFetchError(status = 500, statusText = "Internal Server Error") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: () => Promise.resolve({}),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("opendataTools", () => {
  it("exports 3 tools", () => {
    expect(opendataTools).toHaveLength(3);
  });

  it("tool names are correct", () => {
    const names = opendataTools.map((tool) => tool.name);
    expect(names).toEqual([
      "search_opendata",
      "get_opendata_dataset",
      "list_opendata_resources",
    ]);
  });

  it("search and lookup tools require their ids", () => {
    const search = opendataTools.find((tool) => tool.name === "search_opendata");
    const dataset = opendataTools.find((tool) => tool.name === "get_opendata_dataset");
    const resources = opendataTools.find((tool) => tool.name === "list_opendata_resources");
    expect(search?.inputSchema.required).toContain("query");
    expect(dataset?.inputSchema.required).toContain("dataset_id");
    expect(resources?.inputSchema.required).toContain("dataset_id");
  });
});

describe("search_opendata", () => {
  it("returns slim multilingual catalogue hits", async () => {
    mockFetchJSON(mockSearchResponse);
    const result = JSON.parse(await handleOpendata("search_opendata", { query: "weather" }));
    expect(result.query).toBe("weather");
    expect(result.total_matches).toBe(2);
    expect(result.returned).toBe(2);
    expect(result.results[0].id).toBe("weather-station-klosters");
    expect(result.results[0].title).toBe("Weather Station Klosters");
    expect(result.results[0].organization).toContain("EnviDat");
    expect(result.results[0].keywords).toContain("weather");
    expect(result.results[0].modified).toBe("2026-10-31");
    expect(result.results[0].url).toContain("/dataset/weather-station-klosters");
    expect(result.results[1].title).toBe("Bevölkerungsstatistik");
    expect(result.results[1].resource_count).toBe(2);
    expect(result.source).toContain("opendata.swiss");
  });

  it("queries the ckan host with rows and an organization filter", async () => {
    mockFetchJSON(mockSearchResponse);
    await handleOpendata("search_opendata", {
      query: "population",
      organization: "bundesamt-fur-statistik-bfs",
      limit: 5,
    });
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url.startsWith("https://ckan.opendata.swiss/api/3/action/package_search")).toBe(true);
    expect(url).toContain("q=population");
    expect(url).toContain("rows=5");
    expect(url).toContain("fq=organization%3Abundesamt-fur-statistik-bfs");
  });

  it("caps limit at 20", async () => {
    mockFetchJSON(mockEmptySearch);
    await handleOpendata("search_opendata", { query: "weather", limit: 500 });
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("rows=20");
  });

  it("returns an empty result set", async () => {
    mockFetchJSON(mockEmptySearch);
    const result = JSON.parse(await handleOpendata("search_opendata", { query: "zzzz-none" }));
    expect(result.total_matches).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("throws when query is missing", async () => {
    await expect(handleOpendata("search_opendata", {})).rejects.toThrow("query is required");
    await expect(handleOpendata("search_opendata", { query: "  " })).rejects.toThrow(
      "query is required"
    );
  });

  it("rejects an invalid organization slug", async () => {
    await expect(
      handleOpendata("search_opendata", { query: "weather", organization: "has space" })
    ).rejects.toThrow("organization must be an opendata.swiss publisher slug");
  });

  it("throws when the catalogue reports failure", async () => {
    mockFetchJSON(mockFailedSearch);
    await expect(handleOpendata("search_opendata", { query: "weather" })).rejects.toThrow(
      "opendata.swiss search failed"
    );
  });

  it("throws on HTTP error", async () => {
    mockFetchError(503, "Service Unavailable");
    await expect(handleOpendata("search_opendata", { query: "weather" })).rejects.toThrow(
      "HTTP 503"
    );
  });
});

describe("get_opendata_dataset", () => {
  it("returns dataset metadata and a short resource list", async () => {
    mockFetchJSON(mockPackage);
    const result = JSON.parse(
      await handleOpendata("get_opendata_dataset", { dataset_id: "weather-station-klosters" })
    );
    expect(result.id).toBe("weather-station-klosters");
    expect(result.uuid).toBe("ab1b5ab1-40a3-41d8-8bf6-8c0bb7729b4e");
    expect(result.title).toBe("Weather Station Klosters");
    expect(result.organization_slug).toBe("envidat");
    expect(result.issued).toBe("2019-01-01");
    expect(result.resource_count).toBe(3);
    expect(result.resources[0].name).toBe("Klosters measurements");
    expect(result.resources[0].format).toBe("MAT");
    expect(result.resources[0].byte_size).toBe(2048);
    expect(result.source_url).toContain("weather-station-klosters");
  });

  it("requests package_show by id", async () => {
    mockFetchJSON(mockPackage);
    await handleOpendata("get_opendata_dataset", { dataset_id: " weather-station-klosters " });
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("/package_show?");
    expect(url).toContain("id=weather-station-klosters");
    expect(url.startsWith("https://ckan.opendata.swiss/")).toBe(true);
    expect(url.startsWith("https://opendata.swiss/api")).toBe(false);
  });

  it("throws when dataset_id is missing", async () => {
    await expect(handleOpendata("get_opendata_dataset", {})).rejects.toThrow(
      "dataset_id is required"
    );
  });

  it("throws when the dataset does not exist", async () => {
    mockFetchError(404, "Not Found");
    await expect(
      handleOpendata("get_opendata_dataset", { dataset_id: "missing-dataset" })
    ).rejects.toThrow("Dataset not found: missing-dataset");
  });

  it("throws when CKAN returns success false", async () => {
    mockFetchJSON(mockNotFound);
    await expect(
      handleOpendata("get_opendata_dataset", { dataset_id: "missing-dataset" })
    ).rejects.toThrow("Dataset not found: missing-dataset");
  });
});

describe("list_opendata_resources", () => {
  it("lists every resource", async () => {
    mockFetchJSON(mockPackage);
    const result = JSON.parse(
      await handleOpendata("list_opendata_resources", { dataset_id: "weather-station-klosters" })
    );
    expect(result.total_resources).toBe(3);
    expect(result.matched).toBe(3);
    expect(result.returned).toBe(3);
    expect(result.resources.map((resource: { format: string }) => resource.format)).toEqual([
      "MAT",
      "CSV",
      "WMS",
    ]);
    expect(result.resources[1].byte_size).toBeUndefined();
  });

  it("filters by format", async () => {
    mockFetchJSON(mockPackage);
    const result = JSON.parse(
      await handleOpendata("list_opendata_resources", {
        dataset_id: "weather-station-klosters",
        format: "csv",
      })
    );
    expect(result.format).toBe("CSV");
    expect(result.matched).toBe(1);
    expect(result.resources[0].name).toBe("Vorschau");
    expect(result.resources[0].url).toBe("https://example.ch/preview.csv");
  });

  it("returns an empty resource list", async () => {
    mockFetchJSON(mockPackageNoResources);
    const result = JSON.parse(
      await handleOpendata("list_opendata_resources", { dataset_id: "empty-dataset" })
    );
    expect(result.total_resources).toBe(0);
    expect(result.resources).toEqual([]);
    expect(result.title).toBe("Empty dataset");
    expect(result.organization).toBeUndefined();
  });

  it("throws when dataset_id is blank", async () => {
    await expect(
      handleOpendata("list_opendata_resources", { dataset_id: "   " })
    ).rejects.toThrow("dataset_id is required");
  });

  it("throws on HTTP error", async () => {
    mockFetchError(502, "Bad Gateway");
    await expect(
      handleOpendata("list_opendata_resources", { dataset_id: "weather-station-klosters" })
    ).rejects.toThrow("HTTP 502");
  });
});

describe("unknown opendata tool", () => {
  it("throws for an unrecognized tool name", async () => {
    await expect(handleOpendata("does_not_exist", {})).rejects.toThrow(
      "Unknown opendata tool: does_not_exist"
    );
  });
});
