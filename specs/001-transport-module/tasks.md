# Tasks: Transport Module

**Spec:** 001  
**Status:** All complete ✅

---

## Implementation Tasks

- [x] Create `src/modules/transport.ts`
- [x] Define `transportTools` array with 5 MCP tool definitions
- [x] Implement `handleTransport(name, args)` switch
- [x] `search_stations` — GET /v1/locations with query/x/y/type params
- [x] `get_connections` — GET /v1/connections with from/to/date/time/limit/isArrivalTime
- [x] `get_departures` — GET /v1/stationboard with type=departure
- [x] `get_arrivals` — GET /v1/stationboard with type=arrival
- [x] `get_nearby_stations` — GET /v1/locations with x/y coordinates
- [x] Register transport module in `src/index.ts`
- [x] Export tools list from module

## Test Tasks

- [x] Unit tests: `tests/unit/transport.test.ts`
  - [x] Tool definitions schema validation (22 properties)
  - [x] Parameter validation (required fields)
  - [x] URL construction tests (mocked fetch)
- [x] Integration tests: `tests/integration/transport.integration.ts`
  - [x] Live API call for `search_stations`
  - [x] Live API call for `get_connections`
  - [x] Live API call for `get_departures`
  - [x] Live API call for `get_arrivals`
  - [x] Live API call for `get_nearby_stations`

## Documentation Tasks

- [x] README transport section
- [x] Tool descriptions in source (`description` field)
- [x] docs/tool-specs.md transport section
- [x] docs/tools.schema.json transport entries
