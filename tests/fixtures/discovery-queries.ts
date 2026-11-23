/**
 * How people actually ask, one or more questions per tool.
 *
 * Every tool must be found by swiss_search_tools from these plain-language
 * questions, or agents in the default (search) mode will miss it. Write
 * questions the way a user or agent would phrase the task, not by copying
 * the tool description. Adding a tool without adding questions here fails
 * the coverage test.
 */
export const DISCOVERY_QUERIES: Record<string, string[]> = {
  // transport
  search_stations: ["find the train station called Lausanne", "which stop is Bern Bahnhof"],
  get_connections: ["train from Aigle to Geneva airport", "how do I get from Zurich to Lugano by train", "fastest way from Montreux to Interlaken", "I need to be in Basel by 9, which train should I take from Bern"],
  get_departures: ["next trains leaving Lausanne", "departure board at Zurich HB", "when does the next bus leave Aigle"],
  get_arrivals: ["trains arriving in Bern soon", "arrival board Basel SBB", "when does the train from Milan arrive in Lugano"],
  get_nearby_stations: ["closest bus stop to my coordinates", "stations near 46.52, 6.63"],

  // weather
  get_weather: ["current weather in Zurich", "what's the temperature at Sion right now", "is it raining in Bern", "how windy is it on the Säntis"],
  list_weather_stations: ["which MeteoSwiss weather stations exist", "weather station codes"],
  get_weather_history: ["weather last week in Geneva", "past temperatures at a weather station"],
  get_water_level: ["Rhine river level in Basel", "lake Geneva water temperature", "how high is the Aare in Bern"],
  list_hydro_stations: ["list river measuring stations", "hydrological stations for lakes"],
  get_water_history: ["river level over the last month", "historical lake level Zurich"],

  // geodata
  geocode: ["coordinates of Bahnhofstrasse 1 Zurich", "latitude longitude for an address", "GPS position of Chillon castle"],
  reverse_geocode: ["what address is at these coordinates", "reverse geocode 46.95, 7.44", "which street is at 47.37, 8.54"],
  search_places: ["where is the Matterhorn", "find a mountain called Eiger"],
  get_solar_potential: ["solar panel potential of my roof", "how much sun does this rooftop get"],
  identify_location: ["what geographic features are at this point", "which swisstopo layers cover this location"],
  get_municipality: ["information about the municipality of Aigle", "commune details for Montreux"],

  // companies
  search_companies: ["find the company Nestlé in the commercial register", "look up a Swiss business by name", "is there a firm called Logitech registered"],
  get_company: ["full details of a company by its ehraid", "company record with directors and address"],
  search_companies_by_locality: ["companies registered in Aigle", "businesses based in the town of Zug"],
  list_cantons: ["list all Swiss cantons and their codes", "canton abbreviations"],
  list_legal_forms: ["what legal forms exist like AG and GmbH", "company types in Switzerland"],

  // holidays
  get_public_holidays: ["public holidays in Vaud next year", "is Ascension a bank holiday", "is Whit Monday off in Zurich", "holidays in canton Valais 2027"],
  get_school_holidays: ["school holidays in Geneva", "when are the school vacations in Zurich", "when do kids have autumn break in Vaud"],
  is_holiday_today: ["is today a public holiday", "is it a holiday today in Ticino"],

  // parliament
  search_parliament_business: ["parliament motion about climate", "federal bills on pensions", "has parliament discussed a ban on fireworks"],
  get_parliament_members: ["who are the National Council members from Vaud", "list members of parliament by party", "which MPs represent Geneva"],
  get_parliament_votes: ["how did parliament vote on this bill", "recorded votes on an affair"],
  get_session_schedule: ["when is the next parliament session", "federal parliament session dates"],
  search_parliament_speeches: ["speeches in the debate on the CO2 law", "what was said in parliament debate"],
  get_politician_interests: ["board memberships of a member of parliament", "declared interests and mandates of a politician"],
  search_cantonal_affairs: ["cantonal parliament business in Zurich Kantonsrat", "affairs in the Grand Council of Vaud"],
  get_parliamentary_documents: ["Federal Council statement on a motion", "committee report documents for a bill"],
  get_committee_meetings: ["parliament committee meeting dates", "when does the finance committee meet"],

  // avalanche
  get_avalanche_bulletin: ["avalanche danger in Verbier today", "is it safe to ski off-piste avalanche risk", "avalanche warning for the Bernese Oberland"],
  list_avalanche_regions: ["list avalanche warning regions", "avalanche region ids for Valais"],

  // air quality
  list_air_quality_stations: ["air quality monitoring stations", "where are the NABEL stations"],
  get_air_quality: ["air pollution limits at a station", "air quality in Lausanne"],

  // post
  lookup_postcode: ["which town has postcode 1860", "what locality is ZIP 8001", "what is the town for PLZ 3000"],
  search_postcode: ["postcode for Montreux", "zip code of Aigle"],
  list_postcodes_in_canton: ["all postcodes in canton Valais", "list zip codes in Geneva canton"],
  track_parcel: ["track my Swiss Post parcel", "where is my package tracking number", "follow my Post shipment"],

  // energy
  get_electricity_tariff: ["electricity price in Aigle", "how much does power cost per kWh in my commune", "electricity cost in Lausanne per kWh"],
  compare_electricity_tariffs: ["compare electricity prices between Lausanne and Zurich", "cheapest power tariff among towns"],
  search_municipality_energy: ["municipality number for electricity tariffs", "find BFS number of a commune for energy prices"],

  // statistics
  get_population: ["population of canton Vaud", "how many people live in Switzerland", "how big is the population of Ticino", "inhabitants of Geneva canton"],
  search_statistics: ["federal statistics on unemployment", "BFS dataset about tourism"],
  get_statistic: ["details of a BFS dataset by id", "download links for a statistics dataset"],

  // snb
  list_currencies: ["which currencies have SNB exchange rates", "list of currencies against CHF"],
  get_exchange_rate: ["CHF to EUR rate", "how many francs is one US dollar", "convert GBP to CHF"],
  get_exchange_rate_history: ["euro franc exchange rate over the years", "historical CHF USD rates"],

  // recycling
  get_waste_collection: ["when is the next garbage pickup in Zurich 8003", "paper collection date Zurich", "when is the glass collection in Zurich 8005"],
  list_waste_types: ["what kinds of waste are collected in Zurich", "waste categories cardboard glass"],
  get_waste_calendar: ["Zurich waste calendar for this month", "monthly recycling schedule 8004"],

  // news
  get_swiss_news: ["latest Swiss news headlines", "what's in the news today in Switzerland", "SRF headlines"],
  search_swiss_news: ["news about the SBB", "search headlines for avalanche"],

  // voting
  get_voting_results: ["results of the last referendum", "popular vote results Basel", "outcome of the last national ballot"],
  search_votes: ["find the referendum about pensions", "search popular votes by title"],
  get_vote_details: ["referendum results per district in Basel", "how did Riehen vote"],

  // dams
  search_dams: ["Grande Dixence dam", "find a reservoir dam by name", "biggest dam Contra"],
  get_dams_by_canton: ["dams in canton Valais", "list reservoirs in Ticino"],
  get_dam_details: ["height and volume of the Mauvoisin dam", "technical details of a dam"],

  // hiking
  get_trail_closures: ["closed hiking trails", "hiking path detours in Switzerland", "is the hiking trail to Oeschinensee closed"],
  get_trail_closures_nearby: ["trail closures near Zermatt", "is my hiking route closed near these coordinates"],

  // real estate
  get_property_price_index: ["house price index Switzerland", "how have property prices changed"],
  search_real_estate_data: ["datasets about rents and vacancies", "housing data on construction"],
  get_rent_index: ["consumer price index with rents", "inflation CPI monthly"],

  // traffic
  get_traffic_count: ["traffic volume on the A1 at Bern", "how many cars pass the Gotthard counting station", "traffic on the A9 motorway near Montreux"],
  get_traffic_by_canton: ["traffic counting stations in Vaud", "road traffic counters by canton"],
  get_traffic_nearby: ["traffic counters near these coordinates", "road traffic near me"],

  // earthquakes
  get_recent_earthquakes: ["recent earthquakes in Switzerland", "was there an earthquake today", "any tremors this week"],
  get_earthquake_details: ["details of an earthquake by event id", "magnitude and depth of a seismic event"],
  search_earthquakes_by_location: ["earthquakes near Basel", "seismic events within 50 km of a point"],

  // snow
  get_snow_conditions: ["snow depth in the Alps right now", "how much new snow fell", "fresh snow in Davos"],
  list_snow_stations: ["list SLF snow stations", "snow measuring stations"],
  get_snow_measurements: ["snow data for the Weissfluhjoch station", "measurements at one snow station"],

  // pollen
  get_pollen_current: ["birch pollen level today", "hay fever pollen count now", "my allergies are bad, what is the pollen like"],
  get_pollen_daily: ["daily pollen averages in Lugano", "grass pollen over the past days"],
  list_pollen_stations: ["which pollen measuring stations exist", "list pollen stations"],

  // buildings register (GWR)
  search_buildings: ["find the building at Rue du Midi 5 Aigle", "EGID for an address", "building register entry for Avenue de la Gare 1 Lausanne"],
  get_building: ["heating system and construction year of a building", "building record by EGID"],
  buildings_near: ["buildings near these coordinates", "nearest buildings to a point"],

  // opendata.swiss
  search_opendata: ["open government datasets about bicycles", "search opendata.swiss", "open data about public transport usage"],
  get_opendata_dataset: ["metadata of an opendata.swiss dataset", "who publishes this open data dataset"],
  list_opendata_resources: ["download CSV files of a dataset", "resources and files for an open dataset"],

  // MeteoSwiss OGD
  list_ogd_stations: ["MeteoSwiss open government data stations", "SwissMetNet station list"],
  get_ogd_recent: ["latest 10-minute measurements from a MeteoSwiss station", "recent MeteoSwiss OGD data"],
  get_ogd_history: ["daily MeteoSwiss measurements for last year", "historical climate data for a station"],

  // geo.admin map layers
  search_map_layers: ["find a federal map layer about noise", "geo.admin layers for flood hazard"],
  identify_map_layer: ["what does the hazard map say at this point", "identify features on a map layer"],
  find_map_features: ["find map features with a given attribute", "search a geo.admin layer by value"],

  // SBB open data
  get_station_passengers: ["how many passengers use Lausanne station", "daily passenger numbers at Zurich HB", "busiest SBB stations by passengers"],
  get_station_punctuality: ["were trains on time at Bern yesterday", "train delays at a station"],
  get_station_accessibility: ["is the platform step-free at Aigle", "wheelchair access at a station"],
};
