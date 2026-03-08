# mcp-swiss Tool Specifications

> Complete human + machine-readable specification for all 37 MCP tools.
> Version: 0.2.0 | Generated from source

---

## Table of Contents

- [Transport Module (5 tools)](#transport-module)
- [Weather & Hydrology Module (6 tools)](#weather--hydrology-module)
- [Geodata Module (6 tools)](#geodata-module)
- [Companies Module (5 tools)](#companies-module)
- [Holidays Module (3 tools)](#holidays-module)
- [Parliament Module (4 tools)](#parliament-module)
- [Avalanche Module (2 tools)](#avalanche-module)
- [Air Quality Module (2 tools)](#air-quality-module)
- [Swiss Post Module (4 tools)](#swiss-post-module)

---

## Transport Module

**Base API:** `https://transport.opendata.ch/v1`  
**Docs:** http://transport.opendata.ch/docs.html  
**Auth:** None required

---

## `search_stations`

**Module:** Transport  
**API source:** `https://transport.opendata.ch/v1/locations`  
**Description:** Search for Swiss public transport stations/stops by name or coordinates.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ⬜ | Station name to search for |
| x | number | ⬜ | Longitude (WGS84) |
| y | number | ⬜ | Latitude (WGS84) |
| type | string | ⬜ | Filter: `all`, `station`, `poi`, `address` |

> At least one of `query`, or both `x`+`y` should be provided.

### Output

```json
[
  {
    "id": "8503000",
    "name": "Zürich HB",
    "score": null,
    "coordinate": {
      "type": "WGS84",
      "x": 8.540192,
      "y": 47.378177
    },
    "distance": null
  }
]
```

### Notes

- Returns an array of matching stations
- Use `type=station` to exclude addresses and POIs
- `id` is the SBB/UIC station code (can be used in stationboard queries)

---

## `get_connections`

**Module:** Transport  
**API source:** `https://transport.opendata.ch/v1/connections`  
**Description:** Get train/bus/tram connections between two Swiss locations.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | string | ✅ | Departure station or address |
| to | string | ✅ | Arrival station or address |
| date | string | ⬜ | Date in `YYYY-MM-DD` format (default: today) |
| time | string | ⬜ | Time in `HH:MM` format (default: now) |
| limit | number | ⬜ | Number of connections to return (1–16, default: 4) |
| isArrivalTime | boolean | ⬜ | If `true`, the time is treated as arrival time |

### Output

```json
[
  {
    "from": {
      "station": { "id": "8503000", "name": "Zürich HB" },
      "arrival": null,
      "departure": "2024-03-07T10:02:00+0100",
      "delay": 0,
      "platform": "7"
    },
    "to": {
      "station": { "id": "8501008", "name": "Bern" },
      "arrival": "2024-03-07T10:58:00+0100",
      "departure": null,
      "delay": 0,
      "platform": "5"
    },
    "duration": "00d00:56:00",
    "transfers": 0,
    "sections": [...]
  }
]
```

### Notes

- Supports all Swiss public transport: trains, buses, trams, ships
- `sections` array contains each leg with vehicle details (line, direction, operator)
- `delay` is in minutes; `null` means no delay info available
- Use `isArrivalTime: true` to plan arrival at a specific time

---

## `get_departures`

**Module:** Transport  
**API source:** `https://transport.opendata.ch/v1/stationboard`  
**Description:** Get live departures from a Swiss transport station.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | Station name (e.g. "Zürich HB", "Bern") |
| limit | number | ⬜ | Number of departures to return (default: 10) |
| datetime | string | ⬜ | DateTime in `YYYY-MM-DDTHH:MM` format (default: now) |

### Output

```json
{
  "station": {
    "id": "8503000",
    "name": "Zürich HB",
    "coordinate": { "type": "WGS84", "x": 8.540192, "y": 47.378177 }
  },
  "departures": [
    {
      "stop": { "departure": "2024-03-07T10:00:00+0100", "delay": 2, "platform": "7" },
      "name": "IC 1",
      "category": "IC",
      "number": "1",
      "operator": "SBB",
      "to": "Genève-Aéroport"
    }
  ]
}
```

### Notes

- `delay` is in minutes; `null` if no real-time data available
- `platform` may be `null` for some transport types (bus, tram)
- Covers all modes: IC, IR, RE, S-Bahn, Bus, Tram

---

## `get_arrivals`

**Module:** Transport  
**API source:** `https://transport.opendata.ch/v1/stationboard`  
**Description:** Get live arrivals at a Swiss transport station.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | Station name |
| limit | number | ⬜ | Number of arrivals to return (default: 10) |
| datetime | string | ⬜ | DateTime in `YYYY-MM-DDTHH:MM` format (default: now) |

### Output

```json
{
  "station": {
    "id": "8503000",
    "name": "Zürich HB"
  },
  "arrivals": [
    {
      "stop": { "arrival": "2024-03-07T10:58:00+0100", "delay": 0, "platform": "5" },
      "name": "IC 1",
      "category": "IC",
      "operator": "SBB",
      "to": "Zürich HB"
    }
  ]
}
```

### Notes

- Same API as `get_departures` but uses `type=arrival`
- `to` field shows the final destination of the vehicle

---

## `get_nearby_stations`

**Module:** Transport  
**API source:** `https://transport.opendata.ch/v1/locations`  
**Description:** Find Swiss public transport stations near given WGS84 coordinates.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| x | number | ✅ | Longitude (WGS84), e.g. `8.5401` |
| y | number | ✅ | Latitude (WGS84), e.g. `47.3782` |
| limit | number | ⬜ | Number of results (default: 10) |
| distance | number | ⬜ | Maximum search radius in meters |

### Output

```json
[
  {
    "id": "8503000",
    "name": "Zürich HB",
    "coordinate": { "type": "WGS84", "x": 8.540192, "y": 47.378177 },
    "distance": 42
  },
  {
    "id": "8503090",
    "name": "Zürich, Bahnhofquai/HB",
    "distance": 185
  }
]
```

### Notes

- Results sorted by distance ascending
- `distance` is in meters from the query point
- Only returns stations (not addresses or POIs)

---

## Weather & Hydrology Module

**Base API:** `https://api.existenz.ch/apiv1`  
**Docs:** https://api.existenz.ch  
**Data sources:** MeteoSwiss (weather) + BAFU (hydrology)  
**Auth:** None required

### Common Weather Station Codes

| Code | Location |
|------|----------|
| BER | Bern / Zollikofen |
| SMA | Zürich / Fluntern |
| KLO | Zürich / Kloten (airport) |
| LUG | Lugano |
| GVE | Geneva |
| REH | Zürich / Affoltern |

### Weather Parameter Codes

| Code | Meaning | Unit |
|------|---------|------|
| tt | Temperature | °C |
| rr | Precipitation | mm |
| ss | Sunshine duration | min/h |
| rh | Relative humidity | % |
| ff | Wind speed | km/h |
| fu | Wind gust speed | km/h |
| p0 | Atmospheric pressure | hPa |

---

## `get_weather`

**Module:** Weather  
**API source:** `https://api.existenz.ch/apiv1/smn/latest`  
**Description:** Get current weather conditions at a Swiss MeteoSwiss station.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | Station code (e.g. `BER`, `SMA`, `LUG`, `GVE`, `KLO`) |

### Output

```json
{
  "payload": [
    {
      "loc": "BER",
      "date": "2024-03-07T09:00:00Z",
      "par": "tt",
      "val": 8.4
    },
    {
      "loc": "BER",
      "date": "2024-03-07T09:00:00Z",
      "par": "rr",
      "val": 0.2
    },
    {
      "loc": "BER",
      "date": "2024-03-07T09:00:00Z",
      "par": "ff",
      "val": 12.6
    }
  ]
}
```

### Notes

- Returns multiple measurement records (one per parameter)
- `par` codes: `tt`=temperature, `rr`=precipitation, `ss`=sunshine, `rh`=humidity, `ff`=wind, `fu`=gusts, `p0`=pressure
- Data is updated every 10 minutes
- Station list: use `list_weather_stations` to find available codes

---

## `list_weather_stations`

**Module:** Weather  
**API source:** `https://api.existenz.ch/apiv1/smn/locations`  
**Description:** List all available MeteoSwiss weather stations in Switzerland (~160 stations).

### Input

No parameters required.

### Output

```json
{
  "payload": [
    {
      "code": "BER",
      "name": "Bern / Zollikofen",
      "altitude": 552,
      "lat": 46.9908,
      "lon": 7.4633,
      "canton": "BE"
    },
    {
      "code": "SMA",
      "name": "Zürich / Fluntern",
      "altitude": 556,
      "lat": 47.3775,
      "lon": 8.5660,
      "canton": "ZH"
    }
  ]
}
```

### Notes

- Returns ~160 MeteoSwiss observation stations across Switzerland
- Includes altitude and canton for each station
- Use `code` field with `get_weather` and `get_weather_history`

---

## `get_weather_history`

**Module:** Weather  
**API source:** `https://api.existenz.ch/apiv1/smn/daterange`  
**Description:** Get historical weather data for a Swiss MeteoSwiss station.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | Station code (e.g. `BER`) |
| start_date | string | ✅ | Start date in `YYYY-MM-DD` format |
| end_date | string | ✅ | End date in `YYYY-MM-DD` format |

### Output

```json
{
  "payload": [
    {
      "loc": "BER",
      "date": "2024-03-01T00:00:00Z",
      "par": "tt",
      "val": 5.2
    },
    {
      "loc": "BER",
      "date": "2024-03-01T00:00:00Z",
      "par": "rr",
      "val": 1.4
    }
  ]
}
```

### Notes

- Returns daily values for all parameters in the date range
- Maximum range is typically 1 year; use shorter ranges for performance
- Historical data available from approximately 1980 onwards (varies by station)

---

## `get_water_level`

**Module:** Weather / Hydrology  
**API source:** `https://api.existenz.ch/apiv1/hydro/latest`  
**Description:** Get current river or lake water level and temperature at a Swiss BAFU hydrological station.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | Hydro station ID (e.g. `2135` for Aare/Bern, `2243` for Rhine/Basel) |

### Output

```json
{
  "payload": [
    {
      "loc": "2135",
      "date": "2024-03-07T09:00:00Z",
      "par": "AbflussMittelwert",
      "val": 148.3
    },
    {
      "loc": "2135",
      "date": "2024-03-07T09:00:00Z",
      "par": "Wassertemperatur",
      "val": 9.1
    },
    {
      "loc": "2135",
      "date": "2024-03-07T09:00:00Z",
      "par": "Pegel",
      "val": 124.5
    }
  ]
}
```

### Notes

- **Popular station IDs:** `2135`=Aare/Bern, `2243`=Rhine/Basel
- Parameters include: `Pegel` (water level, cm), `Wassertemperatur` (water temperature, °C), `AbflussMittelwert` (mean discharge, m³/s)
- Use `list_hydro_stations` to discover all 400+ station IDs
- Water temperature is key for the Swiss tradition of Aare swimming in Bern!

---

## `list_hydro_stations`

**Module:** Weather / Hydrology  
**API source:** `https://api.existenz.ch/apiv1/hydro/locations`  
**Description:** List all available BAFU hydrological monitoring stations (rivers and lakes) in Switzerland.

### Input

No parameters required.

### Output

```json
{
  "payload": [
    {
      "code": "2135",
      "name": "Aare - Bern, Schönau",
      "altitude": 490,
      "lat": 46.9368,
      "lon": 7.4500,
      "canton": "BE"
    },
    {
      "code": "2243",
      "name": "Rhein - Basel, Rheinhalle",
      "altitude": 245,
      "lat": 47.5553,
      "lon": 7.5924,
      "canton": "BS"
    }
  ]
}
```

### Notes

- Returns 400+ BAFU monitoring stations across Switzerland
- Covers rivers (Aare, Rhine, Rhône, Inn, Ticino) and lakes
- Use `code` field with `get_water_level` and `get_water_history`

---

## `get_water_history`

**Module:** Weather / Hydrology  
**API source:** `https://api.existenz.ch/apiv1/hydro/daterange`  
**Description:** Get historical river/lake water level data for a Swiss hydrological station.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | Hydro station ID (e.g. `2135`) |
| start_date | string | ✅ | Start date in `YYYY-MM-DD` format |
| end_date | string | ✅ | End date in `YYYY-MM-DD` format |

### Output

```json
{
  "payload": [
    {
      "loc": "2135",
      "date": "2024-08-01T00:00:00Z",
      "par": "Wassertemperatur",
      "val": 21.3
    },
    {
      "loc": "2135",
      "date": "2024-08-01T00:00:00Z",
      "par": "Pegel",
      "val": 118.2
    }
  ]
}
```

### Notes

- Same parameter set as `get_water_level` but over a date range
- Useful for seasonal analysis (e.g., summer swimming conditions year over year)
- Data typically available from the early 2000s onwards

---

## Geodata Module

**Base API:** `https://api3.geo.admin.ch`  
**Docs:** https://api3.geo.admin.ch/api/doc.html  
**Data source:** swisstopo (Federal Office of Topography)  
**Auth:** None required

---

## `geocode`

**Module:** Geodata  
**API source:** `https://api3.geo.admin.ch/rest/services/api/SearchServer`  
**Description:** Convert a Swiss address or place name to WGS84 coordinates using swisstopo.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | string | ✅ | Swiss address or place name (e.g. "Bundesplatz 3, Bern") |

### Output

```json
{
  "results": [
    {
      "id": 1234567,
      "weight": 1,
      "attrs": {
        "label": "Bundesplatz 3, 3003 Bern",
        "lat": 46.9469,
        "lon": 7.4442,
        "x": 2600539,
        "y": 1199774,
        "geom_st_box2d": "BOX(2600489 1199724,2600589 1199824)"
      }
    }
  ]
}
```

### Notes

- Returns results in both WGS84 (`lat`, `lon`) and Swiss LV95 (`x`, `y`) coordinates
- Searches Swiss federal address register (GWR/EWID)
- Up to 10 results returned by default
- `label` contains the formatted address

---

## `reverse_geocode`

**Module:** Geodata  
**API source:** `https://api3.geo.admin.ch/rest/services/api/SearchServer`  
**Description:** Convert WGS84 coordinates to the nearest Swiss address or location name.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | number | ✅ | Latitude (WGS84), e.g. `46.9469` |
| lng | number | ✅ | Longitude (WGS84), e.g. `7.4442` |

### Output

```json
{
  "results": [
    {
      "id": 1234567,
      "attrs": {
        "label": "Bundesplatz, 3003 Bern",
        "lat": 46.9469,
        "lon": 7.4442
      }
    }
  ]
}
```

### Notes

- Uses swisstopo SearchServer with coordinate-based search
- Returns nearest address(es) to the given point
- Accuracy may vary in rural areas and mountains

---

## `search_places`

**Module:** Geodata  
**API source:** `https://api3.geo.admin.ch/rest/services/api/SearchServer`  
**Description:** Search Swiss place names, localities, mountains, rivers, and geographic features.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Place name to search (e.g. "Matterhorn", "Thuner See") |
| type | string | ⬜ | Search type: `locations` (default) or `featuresearch` |

### Output

```json
{
  "results": [
    {
      "id": 9876543,
      "attrs": {
        "label": "Matterhorn",
        "lat": 45.9763,
        "lon": 7.6586,
        "detail": "Matterhorn, Zermatt, Visp, VS",
        "origin": "gg25"
      }
    }
  ]
}
```

### Notes

- `type=locations` searches the Swiss National Map place name database (SwissNAMES3D)
- Covers peaks, passes, lakes, rivers, districts, localities
- `origin` field indicates data source (e.g. `gg25`=swissBOUNDARIES3D, `gg25`=SwissNAMES3D)

---

## `get_solar_potential`

**Module:** Geodata  
**API source:** `https://api3.geo.admin.ch/rest/services/all/MapServer/identify`  
**Description:** Get rooftop solar energy potential for a location in Switzerland (SFOE data).

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | number | ✅ | Latitude (WGS84) |
| lng | number | ✅ | Longitude (WGS84) |

### Output

```json
{
  "results": [
    {
      "layerName": "ch.bfe.solarenergie-eignung-daecher",
      "attributes": {
        "gstrahlung": 1245,
        "klasse": "sehr gut geeignet",
        "klasse_de": "sehr gut geeignet",
        "klasse_fr": "très bien adapté",
        "flaeche": 124.5,
        "stromertrag": 21456
      }
    }
  ]
}
```

### Notes

- Data from SFOE (Swiss Federal Office of Energy) solar cadastre
- `gstrahlung`: annual solar irradiation in kWh/m²
- `stromertrag`: estimated annual electricity yield in kWh
- `klasse`: suitability class (sehr gut=very good, gut=good, geeignet=suitable)
- Returns results for rooftops at the specified coordinate
- May return empty results in rural areas without mapped buildings

---

## `identify_location`

**Module:** Geodata  
**API source:** `https://api3.geo.admin.ch/rest/services/all/MapServer/identify`  
**Description:** Identify geographic features and data layers at a specific Swiss location.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | number | ✅ | Latitude (WGS84) |
| lng | number | ✅ | Longitude (WGS84) |
| layers | string | ⬜ | Comma-separated swisstopo layer IDs (default: all visible layers) |

### Output

```json
{
  "results": [
    {
      "layerId": "ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
      "layerName": "swissBOUNDARIES3D Gemeindegrenzen",
      "attributes": {
        "gemname": "Bern",
        "bfsnr": 351,
        "kanton": "BE",
        "bezirk": "Bern-Mittelland"
      }
    }
  ]
}
```

### Notes

- Queries all swisstopo map layers at the given point
- `layers` parameter accepts swisstopo layer IDs (see https://api3.geo.admin.ch/api/faq/index.html)
- Useful for finding municipality boundaries, land use, protected areas, noise zones, etc.
- Tolerance of 5 pixels is applied; narrow the layers for more precise queries

---

## `get_municipality`

**Module:** Geodata  
**API source:** `https://api3.geo.admin.ch/rest/services/api/SearchServer`  
**Description:** Get information about a Swiss municipality (Gemeinde) by name.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | ✅ | Municipality name (e.g. "Zermatt", "Davos", "Küsnacht") |

### Output

```json
{
  "results": [
    {
      "id": 7777,
      "attrs": {
        "label": "Zermatt",
        "lat": 46.0207,
        "lon": 7.7491,
        "detail": "Zermatt, Visp, VS",
        "origin": "gg25",
        "num": 6130
      }
    }
  ]
}
```

### Notes

- Returns municipalities from swissBOUNDARIES3D
- `num` is the official BFS municipality number (Gemeindenummer)
- Results may include multiple matches for common names

---

## Companies Module

**Base API:** `https://www.zefix.admin.ch/ZefixREST/api/v1`  
**Docs:** https://www.zefix.admin.ch/ZefixREST/swagger-ui.html  
**Data source:** Federal Commercial Register (ZEFIX)  
**Auth:** None required for search; some endpoints return 403

---

## `search_companies`

**Module:** Companies  
**API source:** `https://www.zefix.admin.ch/ZefixREST/api/v1/firm/search.json`  
**Description:** Search the Swiss federal company registry (ZEFIX) by name, canton, or legal form. Returns up to 700K+ registered companies.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | ✅ | Company name or partial name to search |
| canton | string | ⬜ | Canton abbreviation (e.g. `ZH`, `BE`, `GE`, `ZG`) |
| legal_form | string | ⬜ | Legal form code (e.g. `0106`=GmbH, `0105`=AG) |
| limit | number | ⬜ | Maximum results (default: 20) |

### Output

```json
{
  "companies": [
    {
      "ehraid": 119283,
      "name": "Nestlé S.A.",
      "uid": "CHE-116.281.788",
      "legalSeat": "Vevey",
      "legalFormCode": "0105",
      "cantonAbbreviation": "VD",
      "sogcDate": "2024-01-15",
      "deleteDate": null,
      "status": "ACTIVE"
    }
  ],
  "hasMoreResults": false
}
```

### Notes

- `ehraid` is the **ZEFIX internal integer ID** — use this with `get_company` (NOT the CHE-xxx.xxx.xxx UID)
- `uid` is the official UID (CHE-xxx.xxx.xxx) for reference only
- `deleteDate` is non-null for dissolved/deleted companies
- Legal form codes: `0101`=Sole proprietorship, `0103`=General partnership, `0104`=LP, `0105`=AG, `0106`=GmbH, `0107`=Cooperative, `0108`=Association, `0109`=Foundation
- Use `canton` to narrow results (e.g. `ZG` for Zug crypto/fintech scene)

---

## `get_company`

**Module:** Companies  
**API source:** `https://www.zefix.admin.ch/ZefixREST/api/v1/firm/{ehraid}.json`  
**Description:** Get full details of a Swiss company by its ZEFIX internal ID (`ehraid`). Includes registered address, purpose, capital, directors, and journal entries.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ehraid | number | ✅ | ZEFIX internal integer ID (e.g. `119283`). **Get this from `search_companies`** — NOT the CHE-xxx.xxx.xxx UID format. |

### Output

```json
{
  "ehraid": 119283,
  "name": "Nestlé S.A.",
  "uid": "CHE-116.281.788",
  "legalFormCode": "0105",
  "legalSeat": "Vevey",
  "cantonAbbreviation": "VD",
  "address": {
    "street": "Avenue Nestlé",
    "houseNumber": "55",
    "swissZipCode": "1800",
    "town": "Vevey"
  },
  "purpose": "Société holding. La Société a pour but la gestion d'un groupe international...",
  "capitalNominal": 322000000,
  "capitalCurrency": "CHF",
  "status": "ACTIVE",
  "sogcDate": "2024-01-15",
  "deleteDate": null,
  "shabDate": "2024-01-15"
}
```

### Notes

- ⚠️ **Use `ehraid` (integer), NOT the CHE-xxx.xxx.xxx UID format**
- `ehraid` is returned by `search_companies` in the `ehraid` field
- `purpose` is the official registered purpose from the commercial register
- `capitalNominal` is share capital in CHF (for AG/GmbH)
- For dissolved companies, `deleteDate` and `status: "DELETED"` are set

---

## `search_companies_by_address`

**Module:** Companies  
**API source:** `https://www.zefix.admin.ch/ZefixREST/api/v1/firm/search.json`  
**Description:** Search Swiss companies registered at a specific address, street, or locality.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | string | ✅ | Address, street name, or locality to search |
| limit | number | ⬜ | Maximum results (default: 20) |

### Output

```json
{
  "companies": [
    {
      "ehraid": 203847,
      "name": "Crypto Valley AG",
      "uid": "CHE-123.456.789",
      "legalSeat": "Zug",
      "cantonAbbreviation": "ZG",
      "status": "ACTIVE"
    }
  ],
  "hasMoreResults": true
}
```

### Notes

- Uses ZEFIX full-text search on the `name` field (which also matches address components in some cases)
- For precise address filtering, use `search_companies` with `canton` to narrow down
- `hasMoreResults: true` indicates more companies match than the limit

---

## `list_cantons`

**Module:** Companies  
**API source:** Hardcoded (ZEFIX `/cantons` endpoint returns 403)  
**Description:** List all 26 Swiss cantons with their official abbreviation codes.

### Input

No parameters required.

### Output

```json
[
  { "code": "AG", "name": "Aargau" },
  { "code": "AI", "name": "Appenzell Innerrhoden" },
  { "code": "AR", "name": "Appenzell Ausserrhoden" },
  { "code": "BE", "name": "Bern" },
  { "code": "BL", "name": "Basel-Landschaft" },
  { "code": "BS", "name": "Basel-Stadt" },
  { "code": "FR", "name": "Fribourg" },
  { "code": "GE", "name": "Geneva" },
  { "code": "GL", "name": "Glarus" },
  { "code": "GR", "name": "Graubünden" },
  { "code": "JU", "name": "Jura" },
  { "code": "LU", "name": "Lucerne" },
  { "code": "NE", "name": "Neuchâtel" },
  { "code": "NW", "name": "Nidwalden" },
  { "code": "OW", "name": "Obwalden" },
  { "code": "SG", "name": "St. Gallen" },
  { "code": "SH", "name": "Schaffhausen" },
  { "code": "SO", "name": "Solothurn" },
  { "code": "SZ", "name": "Schwyz" },
  { "code": "TG", "name": "Thurgau" },
  { "code": "TI", "name": "Ticino" },
  { "code": "UR", "name": "Uri" },
  { "code": "VD", "name": "Vaud" },
  { "code": "VS", "name": "Valais" },
  { "code": "ZG", "name": "Zug" },
  { "code": "ZH", "name": "Zürich" }
]
```

### Notes

- Returns hardcoded data — the ZEFIX `/cantons` API endpoint returns HTTP 403
- Use `code` values with `search_companies` `canton` parameter
- All 26 cantons included (full/half cantons treated as separate entries)

---

## `list_legal_forms`

**Module:** Companies  
**API source:** Hardcoded (ZEFIX `/legalForms` endpoint returns 403)  
**Description:** List all Swiss company legal forms (AG, GmbH, Verein, Stiftung, etc.) with their numeric codes.

### Input

No parameters required.

### Output

```json
[
  { "code": "0101", "name": "Einzelunternehmen", "nameEn": "Sole proprietorship" },
  { "code": "0103", "name": "Kollektivgesellschaft", "nameEn": "General partnership" },
  { "code": "0104", "name": "Kommanditgesellschaft", "nameEn": "Limited partnership" },
  { "code": "0105", "name": "Aktiengesellschaft (AG)", "nameEn": "Corporation (AG)" },
  { "code": "0106", "name": "Gesellschaft mit beschränkter Haftung (GmbH)", "nameEn": "Limited liability company (GmbH)" },
  { "code": "0107", "name": "Genossenschaft", "nameEn": "Cooperative" },
  { "code": "0108", "name": "Verein", "nameEn": "Association" },
  { "code": "0109", "name": "Stiftung", "nameEn": "Foundation" },
  { "code": "0110", "name": "Kommanditaktiengesellschaft", "nameEn": "Partnership limited by shares" },
  { "code": "0113", "name": "Filiale ausländischer Gesellschaft", "nameEn": "Branch of foreign company" },
  { "code": "0114", "name": "Institut des öffentlichen Rechts", "nameEn": "Public law institution" }
]
```

### Notes

- Returns hardcoded data — the ZEFIX `/legalForms` API endpoint returns HTTP 403
- Use `code` values with `search_companies` `legal_form` parameter
- Most common: `0105` (AG) and `0106` (GmbH) make up the majority of registered companies

---

---

## Holidays Module

**Base API:** `https://openholidaysapi.org`  
**Auth:** None required  
**Data source:** openholidaysapi.org (aggregates official cantonal holiday data)

---

## `get_public_holidays`

**Module:** Holidays  
**API source:** `https://openholidaysapi.org/PublicHolidays`  
**Description:** Get Swiss public holidays for a given year, optionally filtered by canton (e.g. ZH, BE, GE). Returns national and canton-specific holidays.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | ✅ | Year (e.g. 2026) |
| canton | string | ⬜ | Two-letter canton code (e.g. ZH, BE, GE, BS, TI). If omitted, returns all Swiss holidays. |

### Output

```json
{
  "year": 2026,
  "canton": "ZH",
  "count": 12,
  "holidays": [
    {
      "date": "2026-01-01",
      "name": "New Year's Day",
      "type": "Public",
      "nationwide": true
    },
    {
      "date": "2026-08-01",
      "name": "Swiss National Day",
      "type": "Public",
      "nationwide": true
    }
  ],
  "source": "openholidaysapi.org"
}
```

### Notes

- Nationwide holidays appear in all canton-filtered responses
- Canton-specific holidays (e.g. Berchtoldstag in ZH) are included when canton is specified
- `type` values: `Public`, `Optional`

---

## `get_school_holidays`

**Module:** Holidays  
**API source:** `https://openholidaysapi.org/SchoolHolidays`  
**Description:** Get Swiss school holidays for a given year, optionally filtered by canton. Returns holiday periods (start/end dates) by canton.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | ✅ | Year (e.g. 2026) |
| canton | string | ⬜ | Two-letter canton code (e.g. ZH, BE, GE, BS, TI). If omitted, returns school holidays for all cantons. |

### Output

```json
{
  "year": 2026,
  "canton": "ZH",
  "count": 6,
  "holidays": [
    {
      "date": "2026-02-09/2026-02-20",
      "name": "Winter holidays",
      "type": "School",
      "nationwide": false,
      "cantons": ["ZH"]
    }
  ],
  "source": "openholidaysapi.org"
}
```

### Notes

- `date` is `YYYY-MM-DD/YYYY-MM-DD` for multi-day periods
- School holiday dates vary significantly by canton — always filter by canton for accurate results

---

## `is_holiday_today`

**Module:** Holidays  
**API source:** `https://openholidaysapi.org/PublicHolidays`  
**Description:** Check whether today is a Swiss public holiday, optionally for a specific canton. Returns the holiday name if it is one.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ⬜ | Two-letter canton code (e.g. ZH, BE, GE). If omitted, checks nationwide holidays only. |

### Output

```json
{
  "date": "2026-08-01",
  "is_holiday": true,
  "holiday": "Swiss National Day",
  "type": "Public",
  "nationwide": true,
  "canton": "ZH"
}
```

Or if not a holiday:

```json
{
  "date": "2026-03-08",
  "is_holiday": false,
  "canton": "all"
}
```

### Notes

- Uses today's date in UTC; time zone edge cases may cause discrepancy on midnight
- Prefers nationwide holidays over canton-specific when both apply

---

## Parliament Module

**Base API:** `https://ws.parlament.ch/odata.svc`  
**Auth:** None required  
**Protocol:** OData v3 (`application/json`)

---

## `search_parliament_business`

**Module:** Parliament  
**API source:** `https://ws.parlament.ch/odata.svc/Business`  
**Description:** Search Swiss Parliament bills, motions, interpellations, questions and other business items (Geschäfte). Searches the national council and council of states.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Search term (e.g. 'Klimaschutz', 'AHV', 'Neutralität') |
| type | string | ⬜ | Business type: `motion`, `interpellation`, `postulate`, `initiative`, `question`, `bill` |
| year | number | ⬜ | Filter by submission year, e.g. 2024 |
| limit | number | ⬜ | Max results (default: 10, max: 50) |

### Output

```json
{
  "count": 5,
  "query": "AHV",
  "business": [
    {
      "id": 20240001,
      "shortNumber": "24.001",
      "type": "Motion",
      "typeAbbr": "Mo.",
      "title": "AHV-Reform 2025",
      "submittedBy": "Müller Hans",
      "submissionDate": "2024-03-01T00:00:00.000Z",
      "status": "Eingereicht",
      "department": "EDI",
      "tags": ["AHV", "Sozialversicherung"],
      "url": "https://www.parlament.ch/de/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=20240001"
    }
  ]
}
```

### Notes

- Returns results in German (DE) by default (official language of the OData API)
- Business types: motion (5), interpellation (8/9), postulate (6), initiative (1/3/13), question (7/16/17), bill (4/10/19)
- `url` links directly to the Curia Vista parliamentary database entry

---

## `get_latest_votes`

**Module:** Parliament  
**API source:** `https://ws.parlament.ch/odata.svc/Vote`  
**Description:** Get the most recent parliamentary votes (roll-call votes) in the Swiss National Council or Council of States, with vote counts and outcome.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | ⬜ | Number of recent votes to fetch (default: 10, max: 50) |

### Output

```json
{
  "count": 10,
  "votes": [
    {
      "voteId": 123456,
      "registrationNumber": 2024001,
      "businessNumber": "24.001",
      "businessTitle": "AHV-Reform 2025",
      "billTitle": "AHV-Reform Schlussabstimmung",
      "session": "Frühjahrssession 2024",
      "subject": "Schlussabstimmung",
      "meaningYes": "Annahme",
      "meaningNo": "Ablehnung",
      "voteEnd": "2024-03-22T10:30:00.000Z",
      "url": "https://www.parlament.ch/de/ratsbetrieb/abstimmungen/abstimmung#key=2024001"
    }
  ]
}
```

### Notes

- Returns vote metadata only (not individual member votes)
- `meaningYes` / `meaningNo` explain what each vote outcome means in context
- Sorted by most recent first

---

## `search_councillors`

**Module:** Parliament  
**API source:** `https://ws.parlament.ch/odata.svc/MemberCouncil`  
**Description:** Search for Swiss Members of Parliament (National Council or Council of States) by name, canton, party, or council.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | ✅ | Name or partial name of the councillor |
| canton | string | ⬜ | Canton abbreviation (e.g. 'ZH', 'BE', 'GE', 'VS') |
| party | string | ⬜ | Party abbreviation (e.g. 'SP', 'SVP', 'FDP', 'Grüne', 'Mitte') |
| council | string | ⬜ | 'NR' for National Council (Nationalrat), 'SR' for Council of States (Ständerat) |

### Output

```json
{
  "count": 1,
  "councillors": [
    {
      "id": 4123,
      "firstName": "Hans",
      "lastName": "Müller",
      "gender": "m",
      "canton": "ZH",
      "cantonName": "Zürich",
      "council": "NR",
      "councilName": "Nationalrat",
      "parlGroup": "SVP",
      "parlGroupName": "SVP-Fraktion",
      "party": "SVP",
      "partyName": "Schweizerische Volkspartei",
      "birthCity": "Winterthur",
      "url": "https://www.parlament.ch/de/biografie?CouncillorId=4123"
    }
  ]
}
```

### Notes

- Only returns active (currently seated) councillors
- `council`: NR = Nationalrat (200 seats), SR = Ständerat (46 seats)
- Up to 20 results returned

---

## `get_sessions`

**Module:** Parliament  
**API source:** `https://ws.parlament.ch/odata.svc/Session`  
**Description:** List Swiss parliamentary sessions (Sessionen) with dates. Returns current and past sessions.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | ⬜ | Filter by year (e.g. 2025) |
| limit | number | ⬜ | Number of sessions to return (default: 10, max: 20) |

### Output

```json
{
  "count": 4,
  "sessions": [
    {
      "id": 5001,
      "name": "Frühjahrssession 2025",
      "abbreviation": "FS 25",
      "type": "Ordentliche Session",
      "startDate": "2025-03-03T00:00:00.000Z",
      "endDate": "2025-03-21T00:00:00.000Z",
      "title": "50. Legislatur, Frühjahrssession 2025",
      "legislativePeriod": 50
    }
  ]
}
```

### Notes

- The Swiss Parliament meets in 4 ordinary sessions per year: spring (March), summer (June), autumn (September), winter (December)
- Sorted by most recent first

---

## Avalanche Module

**Base API:** `https://aws.slf.ch` (bulletins) / `https://whiterisk.ch` (interactive map)  
**Auth:** None required for PDF bulletins and map; JSON API requires auth  
**Data source:** SLF – WSL Institute for Snow and Avalanche Research

---

## `get_avalanche_bulletin`

**Module:** Avalanche  
**API source:** `https://aws.slf.ch/api/bulletin/document/full/<lang>` (PDF links)  
**Description:** Get the current Swiss avalanche danger bulletin from SLF. Returns current bulletin URLs, danger level descriptions, and links to the interactive map. Published daily at ~08:00 and updated at ~17:00 Swiss time (October–May).

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| region | string | ⬜ | Region ID (e.g. CH-9 for Central Graubünden) or name. Use `list_avalanche_regions` for options. |
| language | string | ⬜ | Language for bulletin links: `de`, `en`, `fr`, `it` (default: en) |

### Output

```json
{
  "date": "2026-01-15",
  "source": "SLF – WSL Institute for Snow and Avalanche Research",
  "bulletin_url": {
    "interactive_map": "https://whiterisk.ch/en/conditions",
    "pdf_full": "https://aws.slf.ch/api/bulletin/document/full/en",
    "pdf_regions": {
      "de": "https://aws.slf.ch/api/bulletin/document/full/de",
      "en": "https://aws.slf.ch/api/bulletin/document/full/en",
      "fr": "https://aws.slf.ch/api/bulletin/document/full/fr",
      "it": "https://aws.slf.ch/api/bulletin/document/full/it"
    }
  },
  "danger_scale": {
    "1": "Low (1/5) — No special precautions needed",
    "2": "Moderate (2/5) — Careful route selection on steep slopes",
    "3": "Considerable (3/5) — Careful assessment required; natural and human-triggered avalanches possible",
    "4": "High (4/5) — Very careful assessment; spontaneous avalanches likely",
    "5": "Very High (5/5) — Extraordinary situation; avoid all avalanche terrain"
  },
  "schedule": {
    "morning_bulletin": "~08:00 CET/CEST",
    "afternoon_update": "~17:00 CET/CEST",
    "season": "October to May (daily). Summer bulletins are occasional."
  },
  "region": {
    "id": "CH-9",
    "name": "Central Graubünden",
    "canton": "GR",
    "typical_elevation_m": 2500,
    "bulletin_link": "https://whiterisk.ch/en/conditions#region=CH-9"
  }
}
```

### Notes

- The SLF JSON API (used by White Risk app) requires authentication — this tool returns PDF/map URLs instead
- Interactive map at whiterisk.ch shows real-time danger levels by region
- Bulletin season: October–May daily; summer bulletins are occasional
- For programmatic access to raw JSON data, contact SLF at lawinfo@slf.ch

---

## `list_avalanche_regions`

**Module:** Avalanche  
**API source:** Hardcoded (official SLF/EAWS region definitions)  
**Description:** List all Swiss avalanche warning regions as defined by SLF/EAWS. Returns region IDs, names, cantons, and typical elevations.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ⬜ | Filter regions by canton abbreviation (e.g. GR, VS, BE). Optional. |

### Output

```json
{
  "count": 22,
  "source": "SLF/EAWS Swiss Avalanche Warning Regions",
  "regions": [
    { "id": "CH-1",  "name": "Jura",                   "canton": "JU/NE/VD",    "typical_elevation_m": 800  },
    { "id": "CH-6",  "name": "Bernese Alps North",      "canton": "BE",          "typical_elevation_m": 2000 },
    { "id": "CH-7",  "name": "Bernese Alps South",      "canton": "BE/VS",       "typical_elevation_m": 2500 },
    { "id": "CH-9",  "name": "Central Graubünden",      "canton": "GR",          "typical_elevation_m": 2500 },
    { "id": "CH-10", "name": "Prättigau & Davos",       "canton": "GR",          "typical_elevation_m": 2000 }
  ],
  "usage": "Pass region ID (e.g. 'CH-9') to get_avalanche_bulletin for region-specific bulletin link",
  "bulletin_map": "https://whiterisk.ch/en/conditions"
}
```

### Notes

- 22 official Swiss avalanche warning regions (CH-1 through CH-22)
- Region IDs follow the EAWS (European Avalanche Warning Services) naming scheme
- Filter by canton to narrow to a specific area

---

## Air Quality Module

**Base API:** `https://api3.geo.admin.ch/rest/services/api/MapServer/ch.bafu.nabelstationen`  
**Auth:** None required  
**Data source:** BAFU (Swiss Federal Office for the Environment) / EMPA — NABEL network

---

## `list_air_quality_stations`

**Module:** Air Quality  
**API source:** Hardcoded + geo.admin.ch `ch.bafu.nabelstationen` layer  
**Description:** List all official Swiss NABEL (Nationales Beobachtungsnetz für Luftfremdstoffe) air quality monitoring stations operated by BAFU/EMPA.

### Input

No parameters required.

### Output

```json
{
  "count": 14,
  "network": "NABEL — Nationales Beobachtungsnetz für Luftfremdstoffe",
  "operator": "BAFU (Swiss Federal Office for the Environment) / EMPA",
  "source": "geo.admin.ch ch.bafu.nabelstationen",
  "data_portal": "https://www.bafu.admin.ch/bafu/en/home/topics/air/state/data/nabel.html",
  "stations": {
    "BAS": "Basel-Binningen (BS) — urban",
    "BER": "Bern-Bollwerk (BE) — urban",
    "DAV": "Davos (GR) — alpine",
    "ZUE": "Zürich-Kaserne (ZH) — urban"
  }
}
```

### Notes

- 14 NABEL monitoring stations covering all major Swiss regions
- Environment types: `urban`, `suburban`, `rural`, `rural-roadside`, `rural-elevated`, `alpine`
- Use station codes (e.g. BER, ZUE) with `get_air_quality`

---

## `get_air_quality`

**Module:** Air Quality  
**API source:** `https://api3.geo.admin.ch/rest/services/api/MapServer/ch.bafu.nabelstationen/{code}`  
**Description:** Get information about a Swiss NABEL air quality monitoring station, including location, environment type, Swiss legal limits (LRV), and a direct link to the BAFU live data portal.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| station | string | ✅ | NABEL station code (e.g. BER, ZUE, LUG, BAS, DAV). Use `list_air_quality_stations` for all codes. |

### Output

```json
{
  "station": "BER",
  "name": "Bern-Bollwerk",
  "canton": "BE",
  "coordinates": { "lat": 46.950993, "lon": 7.440866 },
  "altitude_m": 540,
  "environment": "urban",
  "network": "NABEL",
  "operator": "BAFU / EMPA",
  "source": "geo.admin.ch — ch.bafu.nabelstationen",
  "data_note": "Live NABEL measurements (PM10, PM2.5, O3, NO2, SO2) are published on the BAFU data portal.",
  "live_data_portal": "https://www.bafu.admin.ch/bafu/en/home/topics/air/state/data/nabel.html",
  "swiss_legal_limits_lrv": {
    "PM10":  { "annual_mean_µg_m3": 20, "daily_mean_µg_m3": 50, "who_note": "WHO 2021 guideline: 15 µg/m³ annual, 45 µg/m³ daily" },
    "PM2_5": { "annual_mean_µg_m3": 10, "who_note": "WHO 2021 guideline: 5 µg/m³ annual" },
    "O3":    { "hourly_mean_µg_m3": 120, "who_note": "Peak season 8h: 60 µg/m³ (WHO 2021)" },
    "NO2":   { "annual_mean_µg_m3": 30, "hourly_mean_µg_m3": 100, "who_note": "WHO 2021 guideline: 10 µg/m³ annual" },
    "SO2":   { "annual_mean_µg_m3": 30, "daily_mean_µg_m3": 100 }
  },
  "limits_reference": "LRV (Luftreinhalteordnung / Swiss Clean Air Act, Annex 7)"
}
```

### Notes

- Live measurement data is NOT available via public REST API — the BAFU portal link is provided instead
- `swiss_legal_limits_lrv` contains Swiss Immissionsgrenzwerte (IGW) in µg/m³
- Station data optionally enriched from live geo.admin.ch API (non-blocking fallback)

---

## Swiss Post Module

**Base API:** `https://api3.geo.admin.ch` (postcodes) / `https://service.post.ch` (tracking URL)  
**Auth:** None required  
**Data source:** swisstopo — Amtliches Ortschaftenverzeichnis (PLZ)

---

## `lookup_postcode`

**Module:** Swiss Post  
**API source:** `https://api3.geo.admin.ch/rest/services/api/MapServer/find` + SearchServer  
**Description:** Look up a Swiss postcode (PLZ) to get locality name, canton, and coordinates.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| postcode | string | ✅ | Swiss postal code (PLZ), e.g. "8001" or "3000" |

### Output

```json
{
  "found": true,
  "postcode": 3920,
  "locality": "Zermatt",
  "canton": { "code": "VS", "name": "Valais" },
  "coordinates": { "lat": 46.0207, "lon": 7.7491 },
  "source": "swisstopo — Amtliches Ortschaftenverzeichnis"
}
```

### Notes

- Must be exactly 4 digits
- Returns `found: false` if postcode is not in the official registry
- Canton is identified via reverse-geocoding the PLZ centroid
- Coordinates are the centroid of the PLZ area

---

## `search_postcode`

**Module:** Swiss Post  
**API source:** `https://api3.geo.admin.ch/rest/services/api/MapServer/find`  
**Description:** Search Swiss postcodes by city or locality name. Returns all PLZ entries matching the name.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| city_name | string | ✅ | City or locality name, e.g. "Zürich", "Bern", "Locarno" |

### Output

```json
{
  "query": "Zermatt",
  "count": 1,
  "results": [
    { "postcode": 3920, "locality": "Zermatt" }
  ],
  "source": "swisstopo — Amtliches Ortschaftenverzeichnis"
}
```

### Notes

- Partial name matching supported (e.g. "Bern" returns Bern, Bern-Bümpliz, etc.)
- Deduplicates by PLZ number (multiple registry entries may share one PLZ)
- Uses the `langtext` (official locality name) field

---

## `list_postcodes_in_canton`

**Module:** Swiss Post  
**API source:** `https://api3.geo.admin.ch/rest/services/api/MapServer/find` + identify  
**Description:** List all Swiss postcodes (PLZ) in a given canton. Accepts 2-letter canton codes or full names.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ✅ | Canton code (e.g. "ZH", "BE", "GR") or full name (e.g. "Zürich", "Graubünden") |

### Output

```json
{
  "canton": { "code": "VS", "name": "Valais" },
  "count": 158,
  "postcodes": [
    { "postcode": 1870, "locality": "Monthey" },
    { "postcode": 1890, "locality": "St-Maurice" },
    { "postcode": 3900, "locality": "Brig" },
    { "postcode": 3920, "locality": "Zermatt" }
  ],
  "source": "swisstopo — Amtliches Ortschaftenverzeichnis"
}
```

### Notes

- Accepts full German/French/Italian canton names as well as 2-letter codes
- Results sorted by postcode number ascending
- Deduplicates by PLZ; cross-border entries near canton edges may be included
- API may cap results at ~200; a `note` field is added when this limit is reached

---

## `track_parcel`

**Module:** Swiss Post  
**API source:** `https://service.post.ch/ekp-web/ui/entry/shipping/1/parcel/detail`  
**Description:** Generate a Swiss Post parcel tracking URL for a given tracking number. Swiss Post does not provide a public tracking API; this returns the official tracking page URL.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tracking_number | string | ✅ | Swiss Post tracking number, e.g. "99.00.123456.12345678" for parcels or "RI 123456789 CH" for registered mail |

### Output

```json
{
  "tracking_number": "99.00.123456.12345678",
  "tracking_url": "https://service.post.ch/ekp-web/ui/entry/shipping/1/parcel/detail?parcelId=99.00.123456.12345678",
  "note": "Swiss Post does not provide a public tracking API. This URL opens the official Swiss Post tracking page for your parcel. No authentication required to view tracking status in browser.",
  "formats": "Swiss Post tracking number formats: \"99.xx.xxxxxx.xxxxxxxx\" for standard parcels (e.g. 99.00.123456.12345678), \"RI xxxxxxxxx CH\" for registered mail, \"RR xxxxxxxxx CH\" for registered parcels."
}
```

### Notes

- Swiss Post does not offer a public REST API for parcel tracking
- The returned URL opens directly in any browser — no authentication required
- Supported formats: standard parcels (`99.xx.xxxxxx.xxxxxxxx`), registered mail (`RI xxxxxxxxx CH`, `RR xxxxxxxxx CH`)

---

---

## `get_electricity_tariff`

**Module:** Energy Prices  
**API source:** `https://www.strompreis.elcom.admin.ch/api/graphql` (ElCom — Swiss Federal Electricity Commission)  
**Description:** Get Swiss electricity tariff (price in Rappen/kWh) for a municipality from ElCom. Returns total price and component breakdown (energy, grid, taxes). Valid years: 2011–2026.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| municipality | string | ✅ | Municipality BFS number (e.g. '261' for Zürich, '351' for Bern). Use `search_municipality_energy` to find the ID. |
| category | string | ❌ | Electricity category: H1–H8 (household), C1–C7 (commercial). Default: H4 (~4500 kWh/year) |
| year | string | ❌ | Tariff year (2011–2026). Default: 2026 |

### Output

```json
{
  "municipality": "261",
  "municipalityLabel": "Zürich",
  "canton": "ZH",
  "cantonLabel": "Zürich",
  "operator": "EWZ",
  "category": "H4",
  "year": "2026",
  "total_rp_kwh": 22.5,
  "components": {
    "energy": 8.2,
    "gridusage": 9.1,
    "charge": 1.8,
    "aidfee": 0.23,
    "fixcosts": 2.1,
    "meteringrate": 0.8,
    "annualmeteringcost": 0.27
  },
  "category_description": "Household ~4'500 kWh/year (4-5 room apartment, default)",
  "source": "ElCom — Swiss Federal Electricity Commission",
  "source_url": "https://www.strompreis.elcom.admin.ch"
}
```

---

## `compare_electricity_tariffs`

**Module:** Energy Prices  
**API source:** `https://www.strompreis.elcom.admin.ch/api/graphql` (ElCom)  
**Description:** Compare Swiss electricity tariffs across multiple municipalities side-by-side. Returns prices sorted from cheapest to most expensive.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| municipalities | array of strings | ✅ | Array of BFS municipality numbers (2–20 entries, e.g. ['261', '351', '6621']) |
| category | string | ❌ | Electricity category (H1–H8, C1–C7). Default: H4 |
| year | string | ❌ | Tariff year (2011–2026). Default: 2026 |

### Output

```json
{
  "category": "H4",
  "year": "2026",
  "comparison": [
    { "municipality": "351", "label": "Bern", "canton": "BE", "total_rp_kwh": 20.1 },
    { "municipality": "261", "label": "Zürich", "canton": "ZH", "total_rp_kwh": 22.5 },
    { "municipality": "6621", "label": "Genève", "canton": "GE", "total_rp_kwh": 25.3 }
  ],
  "cheapest": { "municipality": "351", "label": "Bern" },
  "most_expensive": { "municipality": "6621", "label": "Genève" },
  "source": "ElCom — Swiss Federal Electricity Commission",
  "source_url": "https://www.strompreis.elcom.admin.ch"
}
```

---

## `search_municipality_energy`

**Module:** Energy Prices  
**API source:** `https://www.strompreis.elcom.admin.ch/api/graphql` (ElCom)  
**Description:** Search for Swiss municipality IDs needed for electricity tariff lookup. Returns BFS municipality numbers.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | ✅ | Municipality name to search (e.g. 'Zürich', 'Bern', 'Basel') |

### Output

```json
{
  "query": "Zürich",
  "results": [
    { "id": "261", "name": "Zürich" },
    { "id": "62", "name": "Zürich (Kreis 1)" }
  ],
  "source": "ElCom — Swiss Federal Electricity Commission",
  "source_url": "https://www.strompreis.elcom.admin.ch"
}
```

---

## `get_population`

**Module:** Statistics / BFS  
**API source:** `https://www.pxweb.bfs.admin.ch/api/v1/en` (BFS PxWeb — STATPOP)  
**Description:** Get Swiss population data from the Federal Statistical Office (FSO/BFS). Returns population figures for Switzerland, a canton, or all cantons.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ❌ | Canton name or 2-letter code (e.g. 'ZH', 'Zürich', 'Geneva'). Omit for Switzerland total. Use 'all' for all cantons. |
| year | number | ❌ | Year of data (2010–2024). Default: 2024 |

### Output

```json
{
  "location": "Zug",
  "canton_code": "ZG",
  "year": 2024,
  "population": 132000,
  "population_type": "Permanent resident population",
  "source": "Federal Statistical Office (FSO/BFS) — STATPOP",
  "source_url": "https://www.bfs.admin.ch/bfs/en/home/statistics/population.html"
}
```

---

## `search_statistics`

**Module:** Statistics / BFS  
**API source:** `https://ckan.opendata.swiss/api/3/action` (opendata.swiss CKAN)  
**Description:** Search Swiss Federal Statistical Office (BFS/OFS/UST) datasets on opendata.swiss. Returns matching dataset titles, IDs, and descriptions.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Search query (e.g. 'unemployment', 'GDP', 'housing prices', 'birth rate') |
| limit | number | ❌ | Max results (1–20, default 10) |

### Output

```json
{
  "query": "unemployment",
  "total_matches": 42,
  "returned": 10,
  "results": [
    {
      "id": "bevolkerungsstatistik-einwohner",
      "title": "Unemployment statistics",
      "description": "Monthly unemployment rates by canton...",
      "keywords": ["unemployment", "labour market"],
      "modified": "2024-03-15"
    }
  ],
  "source": "opendata.swiss — Federal Statistical Office (BFS/OFS)",
  "source_url": "https://opendata.swiss/en/organization/bundesamt-fur-statistik-bfs"
}
```

---

## `get_statistic`

**Module:** Statistics / BFS  
**API source:** `https://ckan.opendata.swiss/api/3/action` (opendata.swiss CKAN)  
**Description:** Fetch details and resource links for a specific BFS/OFS dataset by its opendata.swiss identifier. Use `search_statistics` first to find dataset IDs.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| dataset_id | string | ✅ | Dataset identifier from opendata.swiss (e.g. 'bevolkerungsstatistik-einwohner') |

### Output

```json
{
  "id": "bevolkerungsstatistik-einwohner",
  "title": "Population statistics",
  "description": "Permanent resident population by canton...",
  "keywords": ["population", "demography"],
  "issued": "2020-01-01",
  "modified": "2024-03-15",
  "organization": "Federal Statistical Office BFS",
  "contact": { "name": "BFS", "email": "info@bfs.admin.ch" },
  "resources": [
    { "name": "Data CSV", "format": "CSV", "url": "https://..." }
  ],
  "source": "opendata.swiss",
  "source_url": "https://opendata.swiss/en/dataset/bevolkerungsstatistik-einwohner"
}
```

---

## SNB Exchange Rates

### `list_currencies`

List all currencies available from the Swiss National Bank (SNB) for CHF exchange rate data.

**Input:** *(no parameters)*

**Output:** JSON array of currency objects with `code`, `name`, `region`, and `seriesId`.

---

### `get_exchange_rate`

Get the current CHF exchange rate for a currency from the Swiss National Bank.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currency | string | ✅ | ISO 4217 currency code (e.g. 'EUR', 'USD', 'GBP') |

### Output

```json
{
  "currency": "EUR",
  "name": "Euro",
  "rate": 0.9423,
  "date": "2026-02",
  "source": "Swiss National Bank (SNB)"
}
```

---

### `get_exchange_rate_history`

Get historical monthly CHF exchange rates for a currency.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| currency | string | ✅ | ISO 4217 currency code (e.g. 'EUR', 'USD') |
| from | string | ❌ | Start date in YYYY-MM format |
| to | string | ❌ | End date in YYYY-MM format |

---

## Recycling / Waste Collection

### `get_waste_collection`

Get next waste collection dates for a Zurich ZIP code and waste type.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zip | string | ✅ | Zurich ZIP code (e.g. '8001') |
| waste_type | string | ✅ | Waste type (waste, cardboard, paper, organic, textile, special, mobile) |
| limit | number | ❌ | Max results (default: 5) |

---

### `list_waste_types`

List all supported waste types with descriptions.

**Input:** *(no parameters)*

---

### `get_waste_calendar`

Get full upcoming waste collection calendar for a Zurich ZIP code.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| zip | string | ✅ | Zurich ZIP code (e.g. '8001') |
| days | number | ❌ | Days ahead to look (default: 30) |

---

## Swiss News

### `get_swiss_news`

Get the latest Swiss news headlines from SRF.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | ❌ | 'switzerland', 'international', or 'economy' (default: 'switzerland') |
| limit | number | ❌ | Number of articles to return (default: 10, max: 50) |

---

### `search_swiss_news`

Search SRF Swiss news by keyword.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Search keyword or phrase |
| limit | number | ❌ | Max results (default: 5, max: 20) |

---

## Voting

### `get_voting_results`

Get results of Swiss popular votes from Basel-Stadt open data.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | ❌ | Filter by year (e.g. 2024) |
| limit | number | ❌ | Max results (default: 10, max: 50) |

---

### `search_votes`

Search Swiss popular votes by keyword.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Search keyword (German/French/Italian) |
| limit | number | ❌ | Max results (default: 5, max: 20) |

---

### `get_vote_details`

Get detailed per-district breakdown of a Swiss popular vote.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| vote_title | string | ❌ | Partial or full vote title |
| date | string | ❌ | Vote date in YYYY-MM-DD format |

---

## Dams & Reservoirs

### `search_dams`

Search Swiss federal dams by name or keyword (SFOE federal supervision registry).

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Dam name or keyword |

---

### `get_dams_by_canton`

List all federal dams in a Swiss canton.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ✅ | Canton abbreviation (e.g. 'VS', 'GR', 'BE') |

---

### `get_dam_details`

Get detailed info on a specific dam (height, volume, purpose, operation year).

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Dam name to look up |

---

## Hiking / Trail Closures

### `get_trail_closures`

Get current Swiss trail closures and hiking alerts from swisstopo.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ❌ | Filter by canton abbreviation (e.g. 'VS') |
| limit | number | ❌ | Max results (default: 20) |

---

### `get_trail_closures_nearby`

Get trail closures near given coordinates.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | number | ✅ | Latitude (WGS84) |
| lon | number | ✅ | Longitude (WGS84) |
| radius | number | ❌ | Search radius in metres (default: 10000) |

---

## Real Estate

### `get_property_price_index`

Swiss property price index from BFS Immo-Monitoring.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ❌ | Canton abbreviation to filter (e.g. 'ZH') |
| property_type | string | ❌ | 'apartment', 'house', or 'all' (default: 'all') |

---

### `search_real_estate_data`

Search BFS real estate datasets on opendata.swiss.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | ✅ | Search term for real estate datasets |
| limit | number | ❌ | Max results (default: 10) |

---

### `get_rent_index`

Swiss rent index and housing cost data from BFS.

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| canton | string | ❌ | Canton abbreviation (e.g. 'ZH') |
| year | number | ❌ | Reference year (e.g. 2024) |

---

*Specification generated from mcp-swiss v0.3.2-dev source code.*  
*API sources: transport.opendata.ch, api.existenz.ch, api3.geo.admin.ch, zefix.admin.ch, openholidaysapi.org, ws.parlament.ch, aws.slf.ch/whiterisk.ch, geo.admin.ch (NABEL), service.post.ch, strompreis.elcom.admin.ch, pxweb.bfs.admin.ch, opendata.swiss, data.snb.ch, openerz.metaodi.ch, srf.ch, data.bs.ch, geo.admin.ch (SFOE dams), geo.admin.ch (hiking)*
