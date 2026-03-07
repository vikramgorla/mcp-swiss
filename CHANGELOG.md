# Changelog

All notable changes to `mcp-swiss` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

---

## [0.1.0] - 2026-03-07

### Added
- **Transport module** (5 tools) — SBB/PostBus/tram via transport.opendata.ch
  - `search_stations` — find stations by name or coordinates
  - `get_connections` — journey planner between any two points
  - `get_departures` — live departures from a station
  - `get_arrivals` — live arrivals at a station
  - `get_nearby_stations` — stations near given coordinates
- **Weather module** (6 tools) — MeteoSwiss + BAFU via api.existenz.ch
  - `get_weather` — current conditions at a MeteoSwiss station
  - `list_weather_stations` — all 160 MeteoSwiss stations
  - `get_weather_history` — historical weather data (up to 32 days)
  - `get_water_level` — river/lake level and temperature
  - `list_hydro_stations` — all BAFU hydrological stations
  - `get_water_history` — historical hydrology data
- **Geodata module** (6 tools) — swisstopo via api3.geo.admin.ch
  - `geocode` — Swiss address/place → coordinates
  - `reverse_geocode` — coordinates → Swiss address
  - `search_places` — Swiss place names and geographic features
  - `get_solar_potential` — rooftop solar irradiation at a location
  - `identify_location` — geographic data layers at a point
  - `get_municipality` — municipality info by name
- **Companies module** (5 tools) — ZEFIX federal registry
  - `search_companies` — search by name, canton, legal form
  - `get_company` — full details by ZEFIX ehraid
  - `search_companies_by_address` — companies at an address
  - `list_cantons` — all 26 Swiss cantons
  - `list_legal_forms` — Swiss company legal forms
- Zero API keys required — all APIs are public Swiss open data
- stdio MCP transport — works with `npx mcp-swiss`
- TypeScript, Node.js 18+ compatible

### Fixed
- ZEFIX `get_company`: uses internal `ehraid` identifier (CHE UID path returns 400)
- ZEFIX `search_companies`: handles 404 response for no-results gracefully
- ZEFIX `list_cantons` / `list_legal_forms`: endpoints return 403; replaced with authoritative hardcoded data
- Weather API: corrected endpoints from `livedata` → `latest`, `pop` → `daterange`
- Weather API: `locations` parameter (not `stations`)
- Geodata identify: corrected path to `/all/MapServer/identify` with WGS84 coords

[Unreleased]: https://github.com/vikramgorla/mcp-swiss/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vikramgorla/mcp-swiss/releases/tag/v0.1.0
