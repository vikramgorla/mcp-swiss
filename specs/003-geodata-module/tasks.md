# Tasks: Geodata Module

**Spec:** 003  
**Status:** All complete ✅

---

## Implementation Tasks

- [x] Create `src/modules/geodata.ts`
- [x] Define `geodataTools` array with 6 MCP tool definitions
- [x] Implement `handleGeodata(name, args)` switch
- [x] `geocode` — GET /rest/services/api/SearchServer with searchText=address
- [x] `reverse_geocode` — GET /rest/services/api/SearchServer with searchText=lat,lng
- [x] `search_places` — GET /rest/services/api/SearchServer with searchText=query
- [x] `get_solar_potential` — GET /rest/services/all/MapServer/identify with solar layer
- [x] `identify_location` — GET /rest/services/all/MapServer/identify with all/custom layers
- [x] `get_municipality` — GET /rest/services/api/SearchServer with searchText=name
- [x] Implement `wgs84ToLV95()` coordinate conversion helper
- [x] Register geodata module in `src/index.ts`
- [x] Export tools list from module

## Test Tasks

- [x] Unit tests: `tests/unit/geodata.test.ts`
  - [x] Tool definitions schema validation
  - [x] `wgs84ToLV95` conversion accuracy test
  - [x] Required parameter validation
  - [x] URL construction (mocked fetch)
- [x] Integration tests: `tests/integration/geodata.integration.ts`
  - [x] Live `geocode` for Bundeshaus Bern
  - [x] Live `reverse_geocode` for Zürich coordinates
  - [x] Live `search_places` for Matterhorn
  - [x] Live `get_solar_potential` for Zürich coords
  - [x] Live `identify_location` for Bern coords
  - [x] Live `get_municipality` for Zermatt

## Documentation Tasks

- [x] README geodata section
- [x] Tool descriptions in source
- [x] WGS84↔LV95 conversion notes in plan.md
- [x] docs/tool-specs.md geodata section
- [x] docs/tools.schema.json geodata entries
