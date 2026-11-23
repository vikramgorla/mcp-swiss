import { describe, it, expect } from "vitest";
import { handleForecast } from "../../src/modules/forecast.js";

const forecast = async (args: Record<string, unknown>) =>
  JSON.parse(await handleForecast("get_weather_forecast", args));

describe("get_weather_forecast (live MeteoSwiss local forecast)", () => {
  it("forecasts a postcode with plausible daily values", async () => {
    const result = await forecast({ location: "1860", days: 5 });
    expect(result.location).toMatchObject({ name: "Aigle", postcode: "1860" });
    expect(result.days).toHaveLength(5);
    for (const day of result.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.temp_max_c).toBeGreaterThanOrEqual(day.temp_min_c);
      expect(day.temp_max_c).toBeGreaterThan(-40);
      expect(day.temp_max_c).toBeLessThan(45);
      expect(day.precipitation_mm).toBeGreaterThanOrEqual(0);
      expect(typeof day.weather).toBe("string");
    }
    // Issued within the last two days.
    expect(Date.now() - Date.parse(result.forecast_issued)).toBeLessThan(2 * 86_400_000);
  }, 70000);

  it("resolves stations, towns and coordinates", async () => {
    expect((await forecast({ location: "SMA", days: 1 })).location.station).toBe("SMA");
    expect((await forecast({ location: "Lugano", days: 1 })).location.type).toBe("postcode");
    expect((await forecast({ lat: 46.948, lon: 7.4474, days: 1 })).location.name).toMatch(/Bern/);
  }, 70000);

  it("covers nine days ahead and answers in French", async () => {
    const result = await forecast({ location: "1204", days: 9, language: "fr" });
    expect(result.days.length).toBeGreaterThanOrEqual(8);
    expect(result.days[0].weather).toMatch(/[a-zé]/);
  }, 70000);

  it("stays well under the 50K response limit", async () => {
    const raw = await handleForecast("get_weather_forecast", { location: "3920", days: 9 });
    expect(raw.length).toBeLessThan(5000);
  }, 70000);
});
