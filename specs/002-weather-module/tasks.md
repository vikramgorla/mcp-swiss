# Tasks: Weather & Hydrology Module

**Spec:** 002  
**Status:** All complete ✅

---

## Implementation Tasks

- [x] Create `src/modules/weather.ts`
- [x] Define `weatherTools` array with 6 MCP tool definitions
- [x] Implement `handleWeather(name, args)` switch
- [x] `get_weather` — GET /apiv1/smn/latest with locations param
- [x] `list_weather_stations` — GET /apiv1/smn/locations
- [x] `get_weather_history` — GET /apiv1/smn/daterange with locations/startdt/enddt
- [x] `get_water_level` — GET /apiv1/hydro/latest with locations param
- [x] `list_hydro_stations` — GET /apiv1/hydro/locations
- [x] `get_water_history` — GET /apiv1/hydro/daterange with locations/startdt/enddt
- [x] Add `app=mcp-swiss&version=0.1.0` attribution params to all calls
- [x] Register weather module in `src/index.ts`
- [x] Export tools list from module

## Test Tasks

- [x] Unit tests: `tests/unit/weather.test.ts`
  - [x] Tool definitions schema validation
  - [x] Station code parameter validation
  - [x] Date range parameter validation
  - [x] URL construction (mocked fetch)
- [x] Integration tests: `tests/integration/weather.integration.ts`
  - [x] Live `get_weather` for BER station
  - [x] Live `list_weather_stations`
  - [x] Live `get_weather_history` for short date range
  - [x] Live `get_water_level` for station 2135
  - [x] Live `list_hydro_stations`
  - [x] Live `get_water_history`

## Documentation Tasks

- [x] README weather section with station code table
- [x] Tool descriptions in source
- [x] docs/tool-specs.md weather section
- [x] docs/tools.schema.json weather entries
