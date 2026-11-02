import { describe, it, expect, vi, afterEach } from "vitest";
import { handleSbbData, sbbDataTools } from "../../src/modules/sbbdata.js";
import {
  mockPassengers,
  mockStops,
  mockLateArrivals,
  mockLateDepartures,
  mockCancelled,
  mockEmptyStops,
  mockPlatforms,
} from "../fixtures/sbbdata.js";

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
      statusText: "Bad Gateway",
      json: () => Promise.resolve({}),
    })
  );
}

function fetchedUrls(): string[] {
  return vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sbbDataTools", () => {
  it("exports the three SBB portal tools", () => {
    expect(sbbDataTools.map((tool) => tool.name)).toEqual([
      "get_station_passengers",
      "get_station_punctuality",
      "get_station_accessibility",
    ]);
    for (const tool of sbbDataTools) {
      expect(tool.inputSchema.required).toEqual(["station"]);
    }
  });
});

describe("get_station_passengers", () => {
  it("returns newest passenger counts for an exact station", async () => {
    mockFetchJSON(mockPassengers);
    const result = JSON.parse(await handleSbbData("get_station_passengers", { station: "Bern" }));
    expect(result.count).toBe(2);
    expect(result.stations[0].year).toBe("2025");
    expect(result.stations[0].daily_avg).toBe(177000);
    expect(result.stations[0].weekday_avg).toBe(191700);
    expect(result.stations[0].canton).toBe("BE");
    expect(result.stations[1].year).toBe("2024");
    expect(result.unit).toContain("boardings");
    expect(result.dataset).toBe("passagierfrequenz");
    const url = fetchedUrls()[0];
    expect(url).toContain("https://data.sbb.ch/api/explore/v2.1/catalog/datasets/passagierfrequenz/records");
    expect(url).toContain("bahnhof_gare_stazione");
    expect(url).not.toContain("like");
  });

  it("filters to one year and can include similar names", async () => {
    mockFetchJSON(mockPassengers);
    const exactYear = JSON.parse(
      await handleSbbData("get_station_passengers", { station: "Bern", year: 2024 })
    );
    expect(exactYear.count).toBe(1);
    expect(exactYear.stations[0].daily_avg).toBe(170000);

    const contains = JSON.parse(
      await handleSbbData("get_station_passengers", { station: "Bern", contains: true, limit: 10 })
    );
    expect(contains.count).toBe(3);
    expect(contains.stations.map((row: { station: string }) => row.station)).toContain("Bern Weissenbühl");
  });

  it("returns an empty list when nothing matches", async () => {
    mockFetchJSON({ total_count: 0, results: [] });
    const result = JSON.parse(await handleSbbData("get_station_passengers", { station: "Nowhere" }));
    expect(result.count).toBe(0);
    expect(result.stations).toEqual([]);
  });

  it("rejects a missing station and a bad year", async () => {
    await expect(handleSbbData("get_station_passengers", {})).rejects.toThrow("station is required");
    await expect(handleSbbData("get_station_passengers", { station: ' " ' })).rejects.toThrow(
      "station is required"
    );
    await expect(handleSbbData("get_station_passengers", { station: "Bern", year: 1800 })).rejects.toThrow(
      "year must be a four-digit year"
    );
  });

  it("throws on HTTP error", async () => {
    mockFetchError(500);
    await expect(handleSbbData("get_station_passengers", { station: "Bern" })).rejects.toThrow("HTTP 500");
  });
});

describe("get_station_punctuality", () => {
  it("summarises the previous operating day", async () => {
    mockFetchJSON(mockStops, mockLateArrivals, mockLateDepartures, mockCancelled);
    const result = JSON.parse(await handleSbbData("get_station_punctuality", { station: "Bern" }));
    expect(result.operating_day).toBe("2026-11-01");
    expect(result.stops).toBe(294);
    expect(result.delayed_arrivals).toBe(11);
    expect(result.delayed_departures).toBe(12);
    expect(result.cancellations).toBe(43);
    expect(result.on_time_arrivals_pct).toBeCloseTo(96.3, 1);
    expect(result.delayed_arrival_sample[0].line).toBe("IR15");
    expect(result.delayed_arrival_sample[0].arrival_delay_seconds).toBe(258);
    expect(result.dataset).toBe("ist-daten-sbb");
    const urls = fetchedUrls();
    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url.includes("/ist-daten-sbb/records"))).toBe(true);
    expect(urls[1]).toContain("ankunftsverspatung");
    expect(urls[3]).toContain("faellt_aus_tf");
  });

  it("adds a line filter", async () => {
    mockFetchJSON(mockStops, mockLateArrivals, mockLateDepartures, mockCancelled);
    await handleSbbData("get_station_punctuality", { station: "Bern", line: "IR15" });
    expect(fetchedUrls()[0]).toContain("linien_text");
    expect(fetchedUrls()[0]).toContain("IR15");
  });

  it("returns zero counts when the stop is absent", async () => {
    mockFetchJSON(mockEmptyStops, mockEmptyStops, mockEmptyStops, mockEmptyStops);
    const result = JSON.parse(await handleSbbData("get_station_punctuality", { station: "Bern" }));
    expect(result.stops).toBe(0);
    expect(result.on_time_arrivals_pct).toBeNull();
    expect(result.delayed_arrival_sample).toEqual([]);
    expect(result.operating_day).toBeNull();
  });

  it("throws on HTTP error", async () => {
    mockFetchError(500);
    await expect(handleSbbData("get_station_punctuality", { station: "Bern" })).rejects.toThrow("HTTP 500");
  });
});

describe("get_station_accessibility", () => {
  it("summarises rail-free platforms for the exact station", async () => {
    mockFetchJSON(mockPlatforms);
    const result = JSON.parse(await handleSbbData("get_station_accessibility", { station: "Bern" }));
    expect(result.platform_count).toBe(2);
    expect(result.rail_free_platforms).toBe(1);
    expect(result.other_platforms).toBe(1);
    expect(result.platforms[0].platform).toBe("3/4");
    expect(result.platforms[0].rail_free_access).toBe(true);
    expect(result.platforms[0].length_m).toBe(510);
    expect(result.platforms[1].rail_free_access).toBe(false);
    expect(fetchedUrls()[0]).toContain("/perron/records");
  });

  it("can include similarly named stations", async () => {
    mockFetchJSON(mockPlatforms);
    const result = JSON.parse(
      await handleSbbData("get_station_accessibility", { station: "Bern", contains: true })
    );
    expect(result.platform_count).toBe(3);
    expect(result.platforms[2].station).toBe("Bern Weissenbühl");
  });

  it("returns no platforms when the station is unknown", async () => {
    mockFetchJSON({ total_count: 0, results: [] });
    const result = JSON.parse(await handleSbbData("get_station_accessibility", { station: "Nowhere" }));
    expect(result.platform_count).toBe(0);
    expect(result.platforms).toEqual([]);
  });
});

describe("unknown SBB data tool", () => {
  it("throws for an unrecognized tool name", async () => {
    await expect(handleSbbData("nope", {})).rejects.toThrow("Unknown SBB data tool: nope");
  });
});
