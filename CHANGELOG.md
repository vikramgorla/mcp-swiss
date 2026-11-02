# Changelog

All notable changes to `mcp-swiss` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added

- Shared HTTP client (`src/utils/http.ts`) with a versioned `mcp-swiss` User-Agent, a 30s timeout (`MCP_SWISS_TIMEOUT_MS`; 120s for BFS PxWeb), and one retry for dropped connections and for 429/502/503/504 (honouring `Retry-After`, capped at 10s). Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng).
- Expiring in-flight cache helper (`src/utils/cache.ts`) and argument validation against each tool's input schema (`src/utils/validate.ts`), including safe coercion of numeric strings and case-insensitive enums. From netadvanced.
- Tool annotations: every tool is advertised as read-only, idempotent, and open-world. From netadvanced.

### Fixed

- Failed lookups now throw, so the MCP client receives `isError` instead of a successful payload shaped like `{"error": "..."}` (voting, energy, earthquakes, SNB, dams, post). An empty-but-valid result still returns `count: 0`. From netadvanced.
- Data corrections ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng):
  - ZEFIX `search_companies` filters by real registry-office ids and legal-form ids. `list_legal_forms` returns that live list (`3` = AG, `4` = GmbH) instead of invented `0106`-style codes.
  - `search_companies_by_address` is now `search_companies_by_locality`: ZEFIX has no street search, so the tool resolves a commune or town and rejects a street address.
  - `get_avalanche_bulletin` returns the public SLF CAAMLv6 bulletin (danger, problems, advice). `list_avalanche_regions` lists the 135 EAWS micro-regions, named the way the English bulletin names them.
  - Earthquakes use the SED catalog over HTTPS (`https://eida.ethz.ch`) and `get_recent_earthquakes` stays inside the Swiss box with a capped result count.
  - The NABEL list includes all 16 stations (Jungfraujoch and Beromünster were missing) and merges codes the geo.admin layer adds later.
  - Dam search pages the full layer (the find endpoint stopped at 201 of 225) and canton filters use the real canton polygon instead of a bounding box.
  - `get_property_price_index` fetches the published BFS IMPI series. Rent-index windows come from the response instead of a hard-coded row count.
  - Weather and water history send `startdate`/`enddate` (the old `startdt`/`enddt` were ignored) and down-sample long ranges.
  - `get_nearby_stations` applies `limit` and `distance` to the station list. Nearby traffic and trail tools filter on real distance instead of a pixel tolerance.
  - `reverse_geocode` resolves the nearest building-register address plus municipality. swisstopo SearchServer has no reverse lookup.
  - Parliament responses drop whole entries instead of cutting mid-JSON, and vote tallies read the fields OpenParlData actually returns.
  - `is_holiday_today` and recycling "today" use the Europe/Zurich calendar date.
  - Population accepts unaccented and multilingual canton names, and the default year comes from the STATPOP cube.
  - Pollen names are decoded as ISO-8859-1, and station checks use the published list.
  - Study-plot snow measurements return an empty result off-season instead of an HTTP 404. Electricity tariffs default to the current year.
  - Postcodes in a canton come from the official locality register. Reference lists expire and share one in-flight fetch. ODSQL search terms in the voting tools are escaped.
  - The `outdoor` preset includes pollen.

### Changed

- Tool schemas are shorter. Closes [#107](https://github.com/vikramgorla/mcp-swiss/issues/107). Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng).
- `scripts/measure-schema-tokens.mjs` (`npm run docs:tokens`) and `scripts/generate-tool-docs.mjs` (`npm run docs:tools`, `--check` in CI) keep `docs/tools.schema.json` and the manifest tool list aligned with the source.
- Transport `x`/`y` descriptions now match the API: `x` is latitude and `y` is longitude.

**GWR module** (3 tools) — Federal Register of Buildings and Dwellings (BFS), via [api3.geo.admin.ch](https://api3.geo.admin.ch) layer `ch.bfs.gebaeude_wohnungs_register`. Closes [#142](https://github.com/vikramgorla/mcp-swiss/issues/142), requested by khashashin. Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng).

- `search_buildings` — find buildings by address and return EGIDs
- `get_building` — decoded record by EGID, including heating, parcel, entrances, and dwellings
- `buildings_near` — buildings around a WGS84 point, closest first
- Added to the `business` preset
- Discovery mode (`--discovery`, `--mode discovery`, or `MCP_SWISS_MODE=discovery`). Closes [#106](https://github.com/vikramgorla/mcp-swiss/issues/106). The default is still the full tool list. Ported in spirit from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng), using a search-then-execute pair instead of dynamic registration:
  - `swiss_search_tools` — keyword or module search; returns matching names, descriptions, and input schemas
  - `swiss_call_tool` — runs one tool after checking the arguments against that tool's schema
  - `swiss_list_modules` — module catalog
- Streamable HTTP transport (`--http` or `MCP_TRANSPORT=http`) alongside stdio. `POST`/`GET`/`DELETE /mcp`, `GET /health`, idle and maximum session lifetime, bearer auth, Host allow-list, and a session cap (`MCP_MAX_SESSIONS`, default 64). A public bind is refused unless `MCP_AUTH_TOKEN` and `MCP_ALLOWED_HOSTS` are set. References [#64](https://github.com/vikramgorla/mcp-swiss/issues/64); no hosted deployment in this change. Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng).

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
