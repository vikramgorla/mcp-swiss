# Changelog

All notable changes to `mcp-swiss` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

---

## [0.1.0] - 2026-03-07

### Added

**Core**
- MCP server on stdio transport — `npx mcp-swiss` works out of the box
- TypeScript strict, Node.js 18+ compatible
- Zero dependencies beyond `@modelcontextprotocol/sdk` and native `fetch`

**Transport module** (5 tools) — [transport.opendata.ch](https://transport.opendata.ch)
- `search_stations` — find stations/stops by name or coordinates
- `get_connections` — journey planner between any two points
- `get_departures` — live departures from a station
- `get_arrivals` — live arrivals at a station
- `get_nearby_stations` — stations near given coordinates

**Weather & Hydrology module** (6 tools) — [api.existenz.ch](https://api.existenz.ch)
- `get_weather` — current conditions at a MeteoSwiss station
- `list_weather_stations` — all ~160 MeteoSwiss stations with full metadata
- `get_weather_history` — historical weather data (up to 32 days)
- `get_water_level` — river/lake level + temperature (BAFU stations)
- `list_hydro_stations` — all 400+ BAFU hydrological monitoring stations
- `get_water_history` — historical hydrology data

**Geodata module** (6 tools) — [api3.geo.admin.ch](https://api3.geo.admin.ch) (swisstopo)
- `geocode` — Swiss address or place name → coordinates
- `reverse_geocode` — coordinates → Swiss address
- `search_places` — Swiss place names, mountains, lakes, geographic features
- `get_solar_potential` — rooftop solar irradiation at a location
- `identify_location` — all geographic data layers at a point (200+ layers)
- `get_municipality` — municipality info by name

**Companies module** (5 tools) — [zefix.admin.ch](https://www.zefix.admin.ch)
- `search_companies` — search ZEFIX registry by name, canton, legal form
- `get_company` — full company details by ZEFIX internal ID (ehraid)
- `search_companies_by_address` — companies registered at an address
- `list_cantons` — all 26 Swiss cantons with codes
- `list_legal_forms` — AG, GmbH, and all Swiss legal forms

**Testing**
- Vitest framework with 104 unit + MCP protocol tests (run in ~9s)
- 27 integration tests against live Swiss APIs
- MCP protocol conformance test (12 assertions on tools/list + tools/call)
- Fixtures for all 4 modules

**Open-source infrastructure**
- Speckit spec-driven development structure (`specs/`, `.specify/`)
  - `specs/000-project-overview/` — project constitution
  - `specs/001-transport-module/` — spec + plan + tasks
  - `specs/002-weather-module/` — spec + plan + tasks
  - `specs/003-geodata-module/` — spec + plan + tasks
  - `specs/004-companies-module/` — spec + plan + tasks
- Tool specifications: `docs/tool-specs.md` + `docs/tools.schema.json`
- CI: Node 18/20/22 matrix, lint, unit tests, integration tests, security audit
- Release workflow: tag → GitHub release with auto-generated notes
- Issue templates (bug report + feature request — YAML forms)
- PR template with module checklist
- `CONTRIBUTING.md` — spec-driven workflow, testing requirements, code style
- `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`
- `CODEOWNERS`, `FUNDING.yml`
- ESLint with TypeScript strict rules (`npm run lint`)
- `npm run validate` — lint + build + test in one command
- `VERSIONING.md` — SemVer policy, branch strategy, conventional commits
- `CHANGELOG.md` — this file

### Fixed
- ZEFIX `get_company`: uses internal `ehraid` integer ID (CHE UID format returns 400)
- ZEFIX `search_companies`: handles 404 response for no-results gracefully
- ZEFIX `list_cantons` / `list_legal_forms`: endpoints return 403 — replaced with authoritative hardcoded data
- Weather API: corrected endpoints (`livedata` → `latest`, `pop` → `daterange`)
- Weather API: corrected parameter name (`stations` → `locations`)
- Geodata identify: corrected path to `/all/MapServer/identify` with WGS84 coordinates directly
- ESLint config: renamed to `.mjs` extension (ESM import requires explicit module type)

[Unreleased]: https://github.com/vikramgorla/mcp-swiss/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vikramgorla/mcp-swiss/releases/tag/v0.1.0
