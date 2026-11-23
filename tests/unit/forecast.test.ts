import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { forecastTools, handleForecast, latestCompleteRun, resetForecastCache } from "../../src/modules/forecast.js";
import { WEATHER_SYMBOLS } from "../../src/modules/weather-symbols.js";
import { mockItem, mockParamCsv, mockPointsCsv } from "../fixtures/forecast.js";

function respond(body: string | object, status = 200) {
  const isText = typeof body === "string";
  const buf = Buffer.from(isText ? body : JSON.stringify(body), isText ? "latin1" : "utf8");
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    headers: new Headers(),
    json: async () => (isText ? JSON.parse(body) : body),
    text: async () => buf.toString(),
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };
}

function installFetch(options: { noItemToday?: boolean } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = String(input);
      if (url.endsWith("_meta_point.csv")) return respond(mockPointsCsv);
      if (url.includes("/items/")) {
        if (options.noItemToday && !url.endsWith(`${yesterday()}-ch`)) return respond({}, 404);
        return respond(mockItem);
      }
      const param = /\.([a-z0-9]+)\.csv$/.exec(url)?.[1];
      if (param && mockParamCsv[param]) return respond(mockParamCsv[param]);
      return respond({}, 404);
    })
  );
}

function yesterday(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
}

const forecast = async (args: Record<string, unknown>) =>
  JSON.parse(await handleForecast("get_weather_forecast", args));

beforeEach(() => {
  resetForecastCache();
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("get_weather_forecast", () => {
  it("is one tool with a short description", () => {
    expect(forecastTools.map((t) => t.name)).toEqual(["get_weather_forecast"]);
    expect(forecastTools[0].description.length).toBeLessThanOrEqual(300);
  });

  it("forecasts a postcode with daily high, low, rain and weather", async () => {
    const result = await forecast({ location: "1860", days: 2 });
    expect(result.location).toMatchObject({ name: "Aigle", type: "postcode", postcode: "1860", height_m: 402 });
    expect(result.days).toEqual([
      { date: "2026-11-23", weather: "very cloudy, intermittent rain", symbol_code: 17, temp_max_c: 8.5, temp_min_c: 4.1, precipitation_mm: 16 },
      { date: "2026-11-24", weather: "sunny intervals, isolated showers", symbol_code: 6, temp_max_c: 7.8, temp_min_c: 3.2, precipitation_mm: 2.4 },
    ]);
    expect(result.source).toMatch(/^Source: MeteoSwiss/);
  });

  it("uses the newest run that has all four files", async () => {
    const result = await forecast({ location: "1860", days: 1 });
    expect(result.forecast_issued).toBe("2026-11-23T14:00:00Z");
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes(".202611231500."))).toBe(false);
  });

  it("prefers the postcode centre for a town name, ignoring accents and case", async () => {
    expect((await forecast({ location: "aigle" })).location.type).toBe("postcode");
    expect((await forecast({ location: "Geneve" })).location).toMatchObject({ name: "Genève", postcode: "1204" });
  });

  it("finds weather stations by code and mountain points by name", async () => {
    expect((await forecast({ location: "SAE" })).location).toMatchObject({ name: "Säntis", station: "SAE" });
    await expect(forecast({ location: "Matterhorn" })).rejects.toThrow(/no forecast values/);
  });

  it("uses the nearest town or station for coordinates", async () => {
    const result = await forecast({ lat: 46.2044, lon: 6.1432 });
    expect(result.location.name).toBe("Genève");
  });

  it("translates the weather into German, French and Italian", async () => {
    const [de, fr, it_] = await Promise.all(
      ["de", "fr", "it"].map(async (language) => (await forecast({ location: "1860", days: 1, language })).days[0].weather)
    );
    expect([de, fr, it_]).toEqual([WEATHER_SYMBOLS[17][1], WEATHER_SYMBOLS[17][2], WEATHER_SYMBOLS[17][3]]);
    expect(fr).toBe("très nuageux, pluies intermittentes");
  });

  it("clamps days to what the run has", async () => {
    expect((await forecast({ location: "1860", days: 30 })).days).toHaveLength(3);
    // days: 0 falls back to the default of 5, which the 3-day fixture caps at 3.
    expect((await forecast({ location: "1860", days: 0 })).days).toHaveLength(3);
  });

  it("downloads each file once per run", async () => {
    await forecast({ location: "1860" });
    await forecast({ location: "1204" });
    const csvCalls = vi.mocked(fetch).mock.calls.filter(([u]) => /\.\d{12}\.[a-z0-9]+\.csv$/.test(String(u)));
    expect(csvCalls).toHaveLength(4);
  });

  it("falls back to yesterday's item just after midnight UTC", async () => {
    resetForecastCache();
    installFetch({ noItemToday: true });
    expect((await forecast({ location: "1860", days: 1 })).days).toHaveLength(1);
  });

  it("explains what to pass when the location is missing or unknown", async () => {
    await expect(forecast({})).rejects.toThrow(/Give a location/);
    await expect(forecast({ location: "9999" })).rejects.toThrow(/No MeteoSwiss forecast point matches "9999"/);
  });
});

describe("latestCompleteRun", () => {
  it("returns null when no run is complete", () => {
    expect(latestCompleteRun({ "vnut12.lssw.202611231500.tre200px.csv": { href: "x" } })).toBeNull();
  });
});

describe("weather symbols", () => {
  it("covers every day and night code in four languages", () => {
    const codes = Object.keys(WEATHER_SYMBOLS).map(Number);
    expect(codes).toHaveLength(84);
    for (let c = 1; c <= 42; c++) expect(codes).toContain(c);
    for (let c = 101; c <= 142; c++) expect(codes).toContain(c);
    for (const texts of Object.values(WEATHER_SYMBOLS)) expect(texts.every((t) => t.length > 0)).toBe(true);
  });
});
