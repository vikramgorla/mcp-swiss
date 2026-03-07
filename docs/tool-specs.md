# mcp-swiss Tool Specifications

> Complete human + machine-readable specification for all 22 MCP tools.
> Version: 0.1.0 | Generated from source

---

## Table of Contents

- [Transport Module (5 tools)](#transport-module)
- [Weather & Hydrology Module (6 tools)](#weather--hydrology-module)
- [Geodata Module (6 tools)](#geodata-module)
- [Companies Module (5 tools)](#companies-module)

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

*Specification generated from mcp-swiss v0.1.0 source code.*  
*API sources: transport.opendata.ch, api.existenz.ch, api3.geo.admin.ch, zefix.admin.ch*
