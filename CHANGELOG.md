# Changelog

All notable changes to `mcp-swiss` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

## [0.10.0] - 2026-11-23

Search mode is now the default. If you rely on all tools being listed directly, add `--mode full`.

### Changed

- **Search mode is now the default.** With no flags, the server lists `swiss_search_tools`, `swiss_call_tool`, `swiss_list_modules`, `get_connections` and `get_departures` (about 1,200 tokens) instead of all 94 tools (about 11,700). Every tool is still reachable through search. Use `--mode full` or `MCP_SWISS_MODE=full` for the old behaviour. Choosing modules with `--modules` or `--preset` still lists those tools directly.
- Clients that call a tool by name in search mode (for example, one remembered from an earlier session) are still served.
- README rewritten as a short entry point (722 → about 110 lines); per-app setup and per-tool detail moved to the site.

### Added

- Documentation site on GitHub Pages: install steps for each app, how search mode works, the full tool catalogue with parameters, and a question box that runs the server's own search in the browser. It's generated from the code (`npm run site`) and deployed on every push to `main`. Closes [#65](https://github.com/vikramgorla/mcp-swiss/issues/65).
- `docs/forks.md`: which forks have been reviewed and what was ported.
- Server `instructions` in the initialize result: how to search, plus the module catalogue.
- The search tool's description names every active module.
- Search fixes misspelt words against the catalogue ("wether" → weather, "trian" → train) and understands everyday words that the tool text doesn't contain ("fastest way", "raining", "MPs", "kids' autumn break").
- `swiss_call_tool` suggests the closest tool names for a mistyped name.
- `--pin` / `MCP_SWISS_PIN` choose which tools are listed next to the search tools (`none` for only the three meta-tools).
- Discoverability test: 222 plain-language questions, at least two per tool. Each must find its tool in the top five search results, and every new tool must add questions.
- `npm run docs:tokens` reports what a client actually receives in each mode.

### Fixed

- The `.mcpb` bundle reported version 0.8.0 since 0.9.0. `manifest.json` is now bumped with each release, and the bundle workflow stamps the release version into it.

### Removed

- Dead files: `test_suite.js` and `run_tests.sh` (22-tool era, hard-coded local paths), `scripts/qa-per-tool.sh` (68-tool era) and `mcp-manifest.json` (stuck at 0.1.4; `server.json` is the registry manifest). Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng) by Pierre Christen.

### Security

- The MCP Registry publish job installs `mcp-publisher` v1.8.15 pinned by SHA-256 instead of downloading "latest" into a job that holds a publish token. Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng) by Pierre Christen.
- Dependabot no longer auto-merges `@modelcontextprotocol/sdk` bumps. It's the one runtime dependency, so its updates get their own PR and a human review. Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng) by Pierre Christen.

## [0.9.1] - 2026-11-23

### Changed

- Discovery mode: `swiss_search_tools` now ranks tools by plain-language queries instead of requiring every word to match. "train from Aigle to Geneva" used to return nothing; it now returns `get_connections` first. Tool names, module names, descriptions and parameter names are weighted in that order, with stopwords dropped and a small synonym list (train → SBB, CHF → exchange rate, referendum → vote).
- Discovery mode: `swiss_call_tool` is annotated read-only, like Atlassian's `executeRead`, since every tool it can run is read-only. A unit test keeps it that way. Clients no longer ask for approval on every call.

### Fixed

- `get_avalanche_bulletin` with a coordinate no longer reports an empty bulletin in force for unrated areas such as Geneva. SLF's geojson now includes outline-only polygons for them.

### Security

- `@hono/node-server` 2.1.5 → 2.1.8 (two medium Dependabot alerts).

## [0.9.0] - 2026-11-02

Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng) (netadvanced). The federal building register was requested by khashashin.

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
- `get_population` fetches the STATPOP table for a year once and serves canton lookups from that result. BFS PxWeb is slow on a cold cache.

### Changed

- Tool schemas are shorter. Closes [#107](https://github.com/vikramgorla/mcp-swiss/issues/107). Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng).
- `scripts/measure-schema-tokens.mjs` (`npm run docs:tokens`) and `scripts/generate-tool-docs.mjs` (`npm run docs:tools`, `--check` in CI) keep `docs/tools.schema.json` and the manifest tool list aligned with the source.
- Transport `x`/`y` descriptions now match the API: `x` is latitude and `y` is longitude.

**GWR module** (3 tools) — Federal Register of Buildings and Dwellings (BFS), via [api3.geo.admin.ch](https://api3.geo.admin.ch) layer `ch.bfs.gebaeude_wohnungs_register`. Closes [#142](https://github.com/vikramgorla/mcp-swiss/issues/142), requested by khashashin. Ported from [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng).

- `search_buildings` — find buildings by address and return EGIDs
- `get_building` — decoded record by EGID, including heating, parcel, entrances, and dwellings
- `buildings_near` — buildings around a WGS84 point, closest first
- Added to the `business` preset
- **opendata.swiss catalogue** (3 tools) — `search_opendata`, `get_opendata_dataset`, `list_opendata_resources`.
- **MeteoSwiss OGD** (3 tools) — `list_ogd_stations`, `get_ogd_recent`, `get_ogd_history`.
- **geo.admin map layers** (3 tools) — `search_map_layers`, `identify_map_layer`, `find_map_features`.
- **SBB open data** (3 tools) — `get_station_passengers`, `get_station_punctuality`, `get_station_accessibility` from data.sbb.ch. Journey planning stays in the transport module.
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

[Unreleased]: https://github.com/vikramgorla/mcp-swiss/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/vikramgorla/mcp-swiss/compare/v0.8.2...v0.9.0
[0.1.0]: https://github.com/vikramgorla/mcp-swiss/releases/tag/v0.1.0
