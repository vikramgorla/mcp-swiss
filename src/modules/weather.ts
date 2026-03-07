import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://api.existenz.ch/apiv1";

export const weatherTools = [
  {
    name: "get_weather",
    description: "Get current weather conditions at a Swiss MeteoSwiss station (e.g. BER=Bern, ZUE=Zürich, LUG=Lugano)",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Station code (e.g. BER, ZUE, LUG, GVE, SMA)" },
      },
    },
  },
  {
    name: "list_weather_stations",
    description: "List all available MeteoSwiss weather stations in Switzerland",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_weather_history",
    description: "Get historical weather data for a Swiss station",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: { type: "string", description: "Station code (e.g. BER)" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        end_date: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "get_water_level",
    description: "Get current river or lake water level and temperature at a Swiss hydrological station",
    inputSchema: {
      type: "object",
      required: ["station"],
      properties: {
        station: { type: "string", description: "Hydro station ID (e.g. 2135 for Aare/Bern, 2243 for Rhine/Basel)" },
      },
    },
  },
  {
    name: "list_hydro_stations",
    description: "List all available BAFU hydrological monitoring stations (rivers and lakes) in Switzerland",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_water_history",
    description: "Get historical river/lake water level data for a Swiss hydrological station",
    inputSchema: {
      type: "object",
      required: ["station", "start_date", "end_date"],
      properties: {
        station: { type: "string", description: "Hydro station ID" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        end_date: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
];

export async function handleWeather(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_weather": {
      const url = buildUrl(`${BASE}/smn/livedata`, { stations: args.station as string });
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "list_weather_stations": {
      const url = `${BASE}/smn/livedata`;
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "get_weather_history": {
      const url = buildUrl(`${BASE}/smn/pop`, {
        stations: args.station as string,
        startdt: args.start_date as string,
        enddt: args.end_date as string,
      });
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "get_water_level": {
      const url = buildUrl(`${BASE}/hydro/latest`, { stations: args.station as string });
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "list_hydro_stations": {
      const url = `${BASE}/hydro/latest`;
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "get_water_history": {
      const url = buildUrl(`${BASE}/hydro/pop`, {
        stations: args.station as string,
        startdt: args.start_date as string,
        enddt: args.end_date as string,
      });
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown weather tool: ${name}`);
  }
}
