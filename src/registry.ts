import { transportTools, handleTransport } from "./modules/transport.js";
import { weatherTools, handleWeather } from "./modules/weather.js";
import { geodataTools, handleGeodata } from "./modules/geodata.js";
import { companiesTools, handleCompanies } from "./modules/companies.js";
import { holidaysTools, handleHolidays } from "./modules/holidays.js";
import { parliamentTools, handleParliament } from "./modules/parliament.js";
import { avalancheTools, handleAvalanche } from "./modules/avalanche.js";
import { airqualityTools, handleAirQuality } from "./modules/airquality.js";
import { postTools, handlePost } from "./modules/post.js";
import { energyTools, handleEnergy } from "./modules/energy.js";
import { statisticsTools, handleStatistics } from "./modules/statistics.js";
import { snbTools, handleSnb } from "./modules/snb.js";
import { recyclingTools, handleRecycling } from "./modules/recycling.js";
import { newsTools, handleNews } from "./modules/news.js";
import { votingTools, handleVoting } from "./modules/voting.js";
import { damsTools, handleDams } from "./modules/dams.js";
import { hikingTools, handleHiking } from "./modules/hiking.js";
import { realEstateTools, handleRealEstate } from "./modules/realestate.js";
import { trafficTools, handleTraffic } from "./modules/traffic.js";
import { earthquakeTools, handleEarthquakes } from "./modules/earthquakes.js";
import { snowTools, handleSnow } from "./modules/snow.js";
import { pollenTools, handlePollen } from "./modules/pollen.js";
import { gwrTools, handleGwr } from "./modules/gwr.js";
import { opendataTools, handleOpendata } from "./modules/opendata.js";
import { meteoswissTools, handleMeteoswiss } from "./modules/meteoswiss.js";

export type ToolHandler = (name: string, args: Record<string, unknown>) => Promise<string>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

export interface ModuleEntry {
  /** One-line summary shown by --list-modules and swiss_list_modules. */
  description: string;
  tools: ToolDefinition[];
  handler: ToolHandler;
}

export const moduleRegistry: Record<string, ModuleEntry> = {
  transport:   { description: "SBB and public transport: stations, connections, departures, arrivals", tools: transportTools, handler: handleTransport },
  weather:     { description: "MeteoSwiss weather stations and BAFU river and lake levels", tools: weatherTools, handler: handleWeather },
  geodata:     { description: "swisstopo geocoding, places, municipalities, solar potential", tools: geodataTools, handler: handleGeodata },
  companies:   { description: "ZEFIX commercial register: companies, cantons, legal forms", tools: companiesTools, handler: handleCompanies },
  holidays:    { description: "Public and school holidays by canton", tools: holidaysTools, handler: handleHolidays },
  parliament:  { description: "Federal and cantonal parliament: affairs, members, votes, speeches", tools: parliamentTools, handler: handleParliament },
  avalanche:   { description: "SLF avalanche bulletins and warning regions", tools: avalancheTools, handler: handleAvalanche as ToolHandler },
  airquality:  { description: "NABEL air-quality stations and legal limits", tools: airqualityTools, handler: handleAirQuality },
  post:        { description: "Swiss Post postcodes and parcel tracking", tools: postTools, handler: handlePost },
  energy:      { description: "ElCom electricity tariffs by municipality", tools: energyTools, handler: handleEnergy },
  statistics:  { description: "BFS statistics: population and datasets", tools: statisticsTools, handler: handleStatistics },
  snb:         { description: "SNB exchange rates and history", tools: snbTools, handler: handleSnb },
  recycling:   { description: "Zurich waste collection dates and types", tools: recyclingTools, handler: handleRecycling },
  news:        { description: "SRF news headlines and search", tools: newsTools, handler: handleNews },
  voting:      { description: "Popular vote results from Basel-Stadt open data", tools: votingTools, handler: handleVoting },
  dams:        { description: "Swiss dams and reservoirs", tools: damsTools, handler: handleDams },
  hiking:      { description: "Hiking trail closures", tools: hikingTools, handler: handleHiking },
  realestate:  { description: "Property price and rent indices, real-estate datasets", tools: realEstateTools, handler: handleRealEstate },
  traffic:     { description: "ASTRA road traffic counts", tools: trafficTools, handler: handleTraffic },
  earthquakes: { description: "SED earthquakes: recent events, details, nearby search", tools: earthquakeTools, handler: handleEarthquakes as ToolHandler },
  snow:        { description: "SLF snow depth from IMIS and study-plot stations", tools: snowTools, handler: handleSnow },
  pollen:      { description: "MeteoSwiss pollen concentrations", tools: pollenTools, handler: handlePollen },
  gwr:         { description: "Federal building register (GWR): buildings and dwellings by address or EGID", tools: gwrTools, handler: handleGwr },
  opendata:    { description: "opendata.swiss catalogue: datasets, metadata, and downloads", tools: opendataTools, handler: handleOpendata },
  meteoswiss:  { description: "MeteoSwiss OGD measurements from SwissMetNet stations", tools: meteoswissTools, handler: handleMeteoswiss },
};

export const presets: Record<string, string[]> = {
  commuter:  ["transport", "weather", "holidays"],
  outdoor:   ["weather", "avalanche", "hiking", "earthquakes", "dams", "snow", "pollen"],
  business:  ["companies", "geodata", "post", "energy", "statistics", "snb", "gwr"],
  citizen:   ["parliament", "voting", "holidays", "news"],
  minimal:   ["transport"],
  full:      Object.keys(moduleRegistry),
};

export type ActiveModule = { name: string } & ModuleEntry;

export function resolveModules(selected: Set<string> | null): ActiveModule[] {
  const names = selected ? [...selected] : Object.keys(moduleRegistry);
  return names
    .filter((n) => moduleRegistry[n])
    .map((n) => ({ name: n, ...moduleRegistry[n] }));
}
