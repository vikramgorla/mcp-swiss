import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { handleMeteoswiss, meteoswissTools } from "../../src/modules/meteoswiss.js";
import {
  mockCollection,
  mockCollectionNoStations,
  mockStationsCsv,
  mockParametersCsv,
  mockRecentCsv,
  mockHistoryCsv,
  mockMonthlyCsv,
  mockEmptyCsv,
  mockItem,
  mockItemNoHourly,
} from "../fixtures/meteoswiss.js";

function installFetch(resolve: (url: string) => { status?: number; json?: unknown; csv?: string } | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = String(input);
      const route = resolve(url);
      if (!route) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      const status = route.status ?? 200;
      const buf = Buffer.from(route.csv ?? "", "latin1");
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? "OK" : "Error",
        json: async () => route.json,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      };
    })
  );
}

function meteoRoutes(extra: Record<string, string> = {}) {
  installFetch((url) => {
    if (url.includes("/items/")) {
      if (url.endsWith("/items/missing")) return null;
      if (url.endsWith("/items/aie")) return { json: mockItemNoHourly };
      return { json: mockItem };
    }
    if (url.includes("meta_stations")) return { csv: mockStationsCsv };
    if (url.includes("meta_parameters")) return { csv: mockParametersCsv };
    if (url.includes("h_now")) return { csv: extra.h_now ?? mockRecentCsv };
    if (url.includes("h_recent")) return { csv: extra.h_recent ?? mockRecentCsv };
    if (url.includes("h_historical")) return { csv: extra.h_historical ?? mockHistoryCsv };
    if (url.includes("d_recent")) return { csv: extra.d_recent ?? mockHistoryCsv };
    if (url.includes("d_historical")) return { csv: extra.d_historical ?? mockHistoryCsv };
    if (url.endsWith("/m.csv") || url.includes("only_m")) return { csv: mockMonthlyCsv };
    if (url.includes("/collections/")) {
      if (url.endsWith("no-stations")) return { json: mockCollectionNoStations };
      return { json: mockCollection };
    }
    return null;
  });
}

function fetchedUrls(): string[] {
  return vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("meteoswissTools", () => {
  it("exports 3 tools", () => {
    expect(meteoswissTools).toHaveLength(3);
    expect(meteoswissTools.map((tool) => tool.name)).toEqual([
      "list_ogd_stations",
      "get_ogd_recent",
      "get_ogd_history",
    ]);
  });

  it("requires station and history dates", () => {
    const recent = meteoswissTools.find((tool) => tool.name === "get_ogd_recent");
    const history = meteoswissTools.find((tool) => tool.name === "get_ogd_history");
    expect(recent?.inputSchema.required).toEqual(["station"]);
    expect(history?.inputSchema.required).toEqual(["station", "start_date", "end_date"]);
  });
});

describe("list_ogd_stations", () => {
  it("lists stations and keeps latin1 names", async () => {
    meteoRoutes();
    const result = JSON.parse(await handleMeteoswiss("list_ogd_stations", { limit: 10 }));
    expect(result.collection).toBe("ch.meteoschweiz.ogd-smn");
    expect(result.collection_alias).toBe("smn");
    expect(result.total_matches).toBe(5);
    expect(result.stations.map((station: { code: string }) => station.code)).toEqual([
      "BAS",
      "BER",
      "GUE",
      "LUG",
      "SMA",
    ]);
    expect(result.stations.find((station: { code: string }) => station.code === "SMA").name).toBe(
      "Zürich / Fluntern"
    );
    expect(result.stations.find((station: { code: string }) => station.code === "GUE").name).toBe("Güttingen");
    expect(result.source).toContain("MeteoSwiss");
  });

  it("filters by canton and query", async () => {
    meteoRoutes();
    const byCanton = JSON.parse(await handleMeteoswiss("list_ogd_stations", { canton: "zh" }));
    expect(byCanton.count).toBe(1);
    expect(byCanton.stations[0].code).toBe("SMA");
    expect(byCanton.stations[0].altitude_m).toBe(556);

    const byQuery = JSON.parse(await handleMeteoswiss("list_ogd_stations", { query: "zollikofen" }));
    expect(byQuery.total_matches).toBe(1);
    expect(byQuery.stations[0].code).toBe("BER");
  });

  it("respects the station limit", async () => {
    meteoRoutes();
    const result = JSON.parse(await handleMeteoswiss("list_ogd_stations", { limit: 2 }));
    expect(result.count).toBe(2);
    expect(result.total_matches).toBe(5);
  });

  it("accepts a full collection id", async () => {
    meteoRoutes();
    const result = JSON.parse(
      await handleMeteoswiss("list_ogd_stations", { collection: "ch.meteoschweiz.ogd-smn", limit: 1 })
    );
    expect(result.collection_alias).toBe("smn");
    expect(fetchedUrls()[0]).toContain("/collections/ch.meteoschweiz.ogd-smn");
  });

  it("rejects an unknown collection before calling the network", async () => {
    await expect(handleMeteoswiss("list_ogd_stations", { collection: "radar" })).rejects.toThrow(
      "Unknown MeteoSwiss collection"
    );
  });

  it("throws when the collection has no station CSV", async () => {
    installFetch((url) => {
      if (url.includes("/collections/")) return { json: mockCollectionNoStations };
      return null;
    });
    await expect(handleMeteoswiss("list_ogd_stations", {})).rejects.toThrow("no station list CSV");
  });

  it("throws on HTTP error", async () => {
    installFetch(() => ({ status: 503, json: {} }));
    await expect(handleMeteoswiss("list_ogd_stations", {})).rejects.toThrow("HTTP 503");
  });
});

describe("get_ogd_recent", () => {
  it("returns the latest hourly rows from the now file", async () => {
    meteoRoutes();
    const result = JSON.parse(
      await handleMeteoswiss("get_ogd_recent", { station: "ber", limit: 2 })
    );
    expect(result.station).toBe("BER");
    expect(result.station_name).toContain("Zollikofen");
    expect(result.granularity).toBe("h");
    expect(result.asset).toContain("h_now");
    expect(result.count).toBe(2);
    expect(result.measurements[0].time).toBe("2026-11-01T23:00:00");
    expect(result.measurements[1].values.tre200h0).toBe(5.1);
    expect(result.measurements[0].values.rre150h0).toBeUndefined();
    expect(result.parameters.tre200h0.description).toBe("Air temperature; hourly mean");
    expect(result.parameters.tre200h0.unit).toBe("°C");
    expect(result.timezone).toBe("Europe/Zurich");
    expect(fetchedUrls().some((url) => url.includes("h_now"))).toBe(true);
    expect(fetchedUrls().some((url) => url.includes("h_historical"))).toBe(false);
  });

  it("can request one parameter", async () => {
    meteoRoutes();
    const result = JSON.parse(
      await handleMeteoswiss("get_ogd_recent", { station: "BER", parameters: "rre150h0", limit: 1 })
    );
    expect(Object.keys(result.measurements[0].values)).toEqual(["rre150h0"]);
    expect(result.parameters.rre150h0.unit).toBe("mm");
  });

  it("throws for an unknown parameter", async () => {
    meteoRoutes();
    await expect(
      handleMeteoswiss("get_ogd_recent", { station: "BER", parameters: "not-a-code" })
    ).rejects.toThrow("None of the requested parameters");
  });

  it("throws when the station code is missing", async () => {
    await expect(handleMeteoswiss("get_ogd_recent", {})).rejects.toThrow("station is required");
    await expect(handleMeteoswiss("get_ogd_recent", { station: "bad code" })).rejects.toThrow(
      "station must be a MeteoSwiss station code"
    );
  });

  it("throws when the station does not exist", async () => {
    meteoRoutes();
    await expect(handleMeteoswiss("get_ogd_recent", { station: "missing" })).rejects.toThrow(
      "Station not found: MISSING"
    );
  });

  it("throws when that resolution is not published", async () => {
    meteoRoutes();
    await expect(
      handleMeteoswiss("get_ogd_recent", { station: "AIE", collection: "nbcn-precip", granularity: "h" })
    ).rejects.toThrow("No hourly recent file");
  });

  it("rejects an unknown granularity", async () => {
    await expect(
      handleMeteoswiss("get_ogd_recent", { station: "BER", granularity: "weekly" })
    ).rejects.toThrow("granularity must be");
  });

  it("returns an empty series for an empty file", async () => {
    meteoRoutes({ h_now: mockEmptyCsv });
    const result = JSON.parse(await handleMeteoswiss("get_ogd_recent", { station: "BER" }));
    expect(result.count).toBe(0);
    expect(result.measurements).toEqual([]);
  });
});

describe("get_ogd_history", () => {
  it("reads the recent daily file for the current year", async () => {
    meteoRoutes();
    const result = JSON.parse(
      await handleMeteoswiss("get_ogd_history", {
        station: "BER",
        start_date: "2026-10-01",
        end_date: "2026-10-03",
      })
    );
    expect(result.granularity).toBe("d");
    expect(result.assets).toEqual(["ogd-smn_ber_d_recent.csv"]);
    expect(result.count).toBe(3);
    expect(result.measurements[0].time).toBe("2026-10-01T00:00:00");
    expect(result.measurements[2].values).toEqual({});
    expect(result.parameters.tre200d0.description).toContain("daily mean");
    expect(fetchedUrls().some((url) => url.includes("d_historical"))).toBe(false);
  });

  it("reads the decade file for older hourly data", async () => {
    meteoRoutes({
      h_historical: [
        "station_abbr;reference_timestamp;tre200h0",
        "BER;01.10.2024 00:00;8.0",
        "BER;02.10.2024 00:00;9.5",
        "BER;03.10.2024 00:00;10.0",
      ].join("\n"),
    });
    const result = JSON.parse(
      await handleMeteoswiss("get_ogd_history", {
        station: "BER",
        granularity: "hourly",
        start_date: "2024-10-01",
        end_date: "2024-10-02",
        limit: 10,
      })
    );
    expect(result.assets).toEqual(["ogd-smn_ber_h_historical_2020-2029.csv"]);
    expect(result.count).toBe(2);
    expect(result.measurements[0].time).toBe("2024-10-01T00:00:00");
    expect(result.measurements[1].values.tre200h0).toBe(9.5);
    expect(fetchedUrls().some((url) => url.includes("h_historical_2020-2029"))).toBe(true);
    expect(fetchedUrls().some((url) => url.includes("h_now"))).toBe(false);
  });

  it("uses the monthly file for monthly history", async () => {
    meteoRoutes();
    const result = JSON.parse(
      await handleMeteoswiss("get_ogd_history", {
        station: "BER",
        granularity: "m",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      })
    );
    expect(result.assets).toEqual(["ogd-smn_ber_m.csv"]);
    expect(result.count).toBe(2);
    expect(result.measurements[1].values.tre200m0).toBe(16.4);
  });

  it("truncates to the latest rows in the range", async () => {
    meteoRoutes();
    const result = JSON.parse(
      await handleMeteoswiss("get_ogd_history", {
        station: "BER",
        start_date: "2026-09-01",
        end_date: "2026-10-31",
        limit: 2,
      })
    );
    expect(result.truncated).toBe(true);
    expect(result.count).toBe(2);
    expect(result.measurements[0].time).toBe("2026-10-03T00:00:00");
    expect(result.measurements[1].time).toBe("2026-10-06T00:00:00");
  });

  it("rejects an inverted or oversized range", async () => {
    await expect(
      handleMeteoswiss("get_ogd_history", {
        station: "BER",
        start_date: "2026-10-05",
        end_date: "2026-10-01",
      })
    ).rejects.toThrow("end_date must be on or after start_date");

    await expect(
      handleMeteoswiss("get_ogd_history", {
        station: "BER",
        granularity: "h",
        start_date: "2026-01-01",
        end_date: "2026-03-01",
      })
    ).rejects.toThrow("limited to 14 days");

    await expect(
      handleMeteoswiss("get_ogd_history", {
        station: "BER",
        start_date: "2026-13-01",
        end_date: "2026-13-02",
      })
    ).rejects.toThrow("start_date must be YYYY-MM-DD");
  });

  it("throws when the station is missing", async () => {
    await expect(
      handleMeteoswiss("get_ogd_history", { start_date: "2026-10-01", end_date: "2026-10-02" })
    ).rejects.toThrow("station is required");
  });
});

describe("unknown MeteoSwiss tool", () => {
  it("throws for an unrecognized tool name", async () => {
    await expect(handleMeteoswiss("does_not_exist", {})).rejects.toThrow(
      "Unknown MeteoSwiss tool: does_not_exist"
    );
  });
});
