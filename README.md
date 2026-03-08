<div align="center">

<img src="assets/icon.svg" width="120" height="120" alt="mcp-swiss" />

# mcp-swiss

**Swiss open data for AI — zero config, zero API keys**

[![npm](https://img.shields.io/npm/v/mcp-swiss.svg?style=flat-square)](https://www.npmjs.com/package/mcp-swiss)
[![CI](https://img.shields.io/github/actions/workflow/status/vikramgorla/mcp-swiss/ci.yml?style=flat-square&label=CI)](https://github.com/vikramgorla/mcp-swiss/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-D52B1E?style=flat-square)](https://modelcontextprotocol.io)
[![Downloads](https://img.shields.io/npm/dm/mcp-swiss.svg?style=flat-square)](https://www.npmjs.com/package/mcp-swiss)
[![Stars](https://img.shields.io/github/stars/vikramgorla/mcp-swiss?style=flat-square)](https://github.com/vikramgorla/mcp-swiss)
[![Node](https://img.shields.io/node/v/mcp-swiss?style=flat-square)](https://nodejs.org)
[![.mcpb](https://img.shields.io/badge/.mcpb-One--Click_Install-D52B1E?style=flat-square)](https://github.com/vikramgorla/mcp-swiss/releases/latest)

[Install](#installation) · [Tools](#tools) · [Demo](#demo-prompts) · [Data Sources](#data-sources)

</div>

---

`mcp-swiss` is a [Model Context Protocol](https://modelcontextprotocol.io) server that gives any AI assistant direct access to Swiss open data — trains, weather, rivers, maps, and companies.

**68 tools. No API keys. No registration. No server to run. Just `npx mcp-swiss`.**

```
🚆 Transport    — SBB, PostBus, trams, live departures, journey planning
🌤️ Weather      — MeteoSwiss live conditions + historical data
🌊 Hydrology    — BAFU river & lake levels (great for Aare swimming!)
🗺️ Geodata      — swisstopo geocoding, solar potential, geographic layers
🏢 Companies    — ZEFIX federal registry, all 700K+ Swiss companies
🎄 Holidays     — Swiss public & school holidays by canton
🏛️ Parliament   — Bills, votes, councillors, session schedule
🏔️ Avalanche    — SLF danger bulletins and warning regions
💨 Air Quality  — NABEL stations, Swiss legal limits (LRV)
📮 Swiss Post   — Postcode lookup and parcel tracking
⚡ Energy       — Electricity tariffs by municipality (ElCom)
📊 Statistics   — Population, demographics, BFS datasets
🏦 SNB Rates    — Swiss National Bank CHF exchange rates, historical data
♻️ Recycling    — Zurich city waste collection calendar (OpenERZ)
📰 Swiss News   — SRF news headlines and keyword search
🗳️ Voting       — Swiss popular vote results (Basel-Stadt open data)
🌊 Dams         — Swiss federal dam registry (SFOE/swisstopo)
🥾 Hiking       — Swiss trail closures and hiking alerts (swisstopo)
🏠 Real Estate  — Swiss property prices, rent index, housing data (BFS)
🚗 Traffic      — ASTRA counting stations, daily volumes
🌍 Earthquakes  — Swiss Seismological Service (SED/ETH Zürich), FDSN API
```

---

## Installation

### Quick Start

```bash
npx mcp-swiss
```

That's it. No API keys, no `.env` files, no accounts. Pick your client below and paste the config.

---

### One-Click Install (.mcpb)

`.mcpb` bundles work with Claude Desktop and any MCP Bundle-compatible app.

1. Go to the [latest release](https://github.com/vikramgorla/mcp-swiss/releases/latest)
2. Download the `mcp-swiss-X.Y.Z.mcpb` file (under Assets)
3. Open the file — your app handles the rest

No config editing, no terminal commands, no API keys.

---

### Claude Desktop

Edit your config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

Restart Claude Desktop after saving.

---

### Claude Code (CLI)

```bash
claude mcp add swiss -- npx -y mcp-swiss
```

That's it — Claude Code will use it in your next session.

---

### Cursor

> Requires Cursor 0.45.6+

**Option A: Project config** — create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**Option B: Global config** — create `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**Option C: Via Cursor Settings UI**
1. Open Cursor Settings
2. Go to **Features → MCP Servers**
3. Click **+ Add new global MCP server**
4. Paste the JSON config above

---

### VS Code (GitHub Copilot)

#### One-click Install

[<img src="https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522swiss%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522mcp-swiss%2522%255D%257D)
[<img src="https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white" alt="Install in VS Code Insiders">](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522swiss%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522mcp-swiss%2522%255D%257D)

#### CLI Install

```bash
# VS Code
code --add-mcp '{"name":"swiss","command":"npx","args":["-y","mcp-swiss"]}'

# VS Code Insiders
code-insiders --add-mcp '{"name":"swiss","command":"npx","args":["-y","mcp-swiss"]}'
```

#### Manual Config

Add to your VS Code User Settings (JSON) — press `Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)`:

```json
{
  "mcp": {
    "servers": {
      "swiss": {
        "command": "npx",
        "args": ["-y", "mcp-swiss"]
      }
    }
  }
}
```

Or add to `.vscode/mcp.json` in your workspace (shareable with your team):

```json
{
  "servers": {
    "swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

---

### Windsurf

Add to `~/.codeium/windsurf/model_config.json`:

```json
{
  "mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

---

### Cline (VS Code)

Open VS Code `settings.json` and add:

```json
{
  "cline.mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

---

### Any MCP Client

`mcp-swiss` uses **stdio transport** and requires no environment variables. The universal config:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-swiss"]
}
```

This works with any MCP-compatible client — just plug it in.

### Docker

```bash
docker pull vikramgorla/mcp-swiss
```

Use with any MCP client that supports Docker-based servers. The container uses stdio transport:

```bash
# Run directly (stdio)
docker run -i vikramgorla/mcp-swiss

# Use with Claude Desktop
```

For Claude Desktop, update your config to use Docker:

```json
{
  "mcpServers": {
    "swiss": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "vikramgorla/mcp-swiss"]
    }
  }
}
```

Also available on GitHub Container Registry:

```bash
docker pull ghcr.io/vikramgorla/mcp-swiss
```

---

## Demo Prompts

Once connected, try asking your AI:

| Prompt | What it uses |
|--------|-------------|
| *"Next 5 trains from Zürich HB to Geneva"* | `get_connections` |
| *"Is the Aare in Bern warm enough to swim?"* | `get_water_level` |
| *"Weather in Lugano vs Zürich today"* | `get_weather` |
| *"Find blockchain companies registered in Zug"* | `search_companies` |
| *"Solar potential of Bundesplatz 3, Bern"* | `geocode` + `get_solar_potential` |
| *"Live departures from Bern HB"* | `get_departures` |
| *"What rivers are near Thun?"* | `list_hydro_stations` + `get_water_level` |
| *"Plan my Saturday: train to Interlaken, check weather"* | Multiple tools chained |
| *"Is next Monday a holiday in Zürich?"* | `get_public_holidays` |
| *"What did the Swiss parliament vote on recently?"* | `get_latest_votes` |
| *"What's the avalanche danger level in the Bernese Alps?"* | `get_avalanche_bulletin` |
| *"What's the postcode for Zermatt?"* | `search_postcode` |
| *"Track my Swiss Post parcel 99.12.345678.12345678"* | `track_parcel` |
| *"How much does electricity cost in Zürich vs Basel?"* | `search_municipality_energy` + `compare_electricity_tariffs` |
| *"What's the population of canton Zug?"* | `get_population` |

---

## Tools

> 68 tools across 20 modules. Full specifications: [`docs/tool-specs.md`](docs/tool-specs.md) · Machine-readable: [`docs/tools.schema.json`](docs/tools.schema.json)

### 🚆 Transport (5 tools)

| Tool | Description |
|------|-------------|
| `search_stations` | Find stations/stops by name or location |
| `get_connections` | Journey planner between any two points |
| `get_departures` | Live departures from a station |
| `get_arrivals` | Live arrivals at a station |
| `get_nearby_stations` | Stations near coordinates |

### 🌤️ Weather & Hydrology (6 tools)

| Tool | Description |
|------|-------------|
| `get_weather` | Current conditions at a MeteoSwiss station |
| `list_weather_stations` | All ~160 MeteoSwiss stations with metadata |
| `get_weather_history` | Historical weather data (up to 32 days) |
| `get_water_level` | River/lake level + temperature (BAFU) |
| `list_hydro_stations` | All 400+ hydrological monitoring stations |
| `get_water_history` | Historical hydrology data |

### 🗺️ Geodata / swisstopo (6 tools)

| Tool | Description |
|------|-------------|
| `geocode` | Swiss address → coordinates |
| `reverse_geocode` | Coordinates → Swiss address |
| `search_places` | Swiss place names, mountains, lakes, features |
| `get_solar_potential` | Rooftop solar irradiation at a location |
| `identify_location` | All geographic data layers at a point |
| `get_municipality` | Municipality info by name |

### 🏢 Companies / ZEFIX (5 tools)

| Tool | Description |
|------|-------------|
| `search_companies` | Search by name, canton, legal form |
| `get_company` | Full company details by ZEFIX `ehraid` |
| `search_companies_by_address` | Companies registered at an address |
| `list_cantons` | All 26 Swiss cantons |
| `list_legal_forms` | AG, GmbH, and all Swiss legal forms |

### 🎄 Holidays (3 tools)

| Tool | Description |
|------|-------------|
| `get_public_holidays` | Swiss public holidays by year, optionally filtered by canton |
| `get_school_holidays` | School holiday periods by year and canton |
| `is_holiday_today` | Quick check if today is a public holiday |

### 🏛️ Parliament (4 tools)

| Tool | Description |
|------|-------------|
| `search_parliament_business` | Search bills, motions, interpellations |
| `get_latest_votes` | Recent parliamentary vote results |
| `search_councillors` | Find members of the National/States Council |
| `get_sessions` | Parliamentary session schedule |

### 🏔️ Avalanche (2 tools)

| Tool | Description |
|------|-------------|
| `get_avalanche_bulletin` | Current avalanche bulletin with danger levels and PDF links |
| `list_avalanche_regions` | All 22 Swiss avalanche warning regions |

### 💨 Air Quality (2 tools)

| Tool | Description |
|------|-------------|
| `list_air_quality_stations` | All 14 NABEL monitoring stations |
| `get_air_quality` | Station info, Swiss legal limits (LRV), and BAFU data links |

### 📮 Swiss Post (4 tools)

| Tool | Description |
|------|-------------|
| `lookup_postcode` | PLZ → locality, canton, coordinates |
| `search_postcode` | City name → matching postcodes |
| `list_postcodes_in_canton` | All postcodes in a canton |
| `track_parcel` | Generate Swiss Post tracking URL for a parcel |

### ⚡ Energy Prices (3 tools)

| Tool | Description |
|------|-------------|
| `get_electricity_tariff` | Electricity tariff by municipality with component breakdown |
| `compare_electricity_tariffs` | Compare electricity prices across municipalities |
| `search_municipality_energy` | Find municipality ID for tariff lookup |

### 📊 Statistics / BFS (3 tools)

| Tool | Description |
|------|-------------|
| `get_population` | Population by canton or municipality from BFS STATPOP |
| `search_statistics` | Search BFS datasets on opendata.swiss |
| `get_statistic` | Fetch detailed dataset information |

### 🏦 SNB Exchange Rates (3 tools)

| Tool | Description |
|------|-------------|
| `list_currencies` | List all currencies available from the Swiss National Bank (SNB) |
| `get_exchange_rate` | Get the current CHF exchange rate for any currency |
| `get_exchange_rate_history` | Get historical monthly CHF exchange rates with date filtering |

### ♻️ Recycling / Waste Collection (3 tools)

| Tool | Description |
|------|-------------|
| `get_waste_collection` | Next waste collection dates by Zurich ZIP code and waste type |
| `list_waste_types` | List all supported waste types with descriptions |
| `get_waste_calendar` | Full waste collection calendar for a ZIP code (upcoming dates) |

### 📰 Swiss News (2 tools)

| Tool | Description |
|------|-------------|
| `get_swiss_news` | Latest Swiss headlines from SRF by category (Switzerland/international/economy) |
| `search_swiss_news` | Search SRF news by keyword across all categories |

### 🗳️ Voting (3 tools)

| Tool | Description |
|------|-------------|
| `get_voting_results` | Swiss popular vote results from Basel-Stadt open data |
| `search_votes` | Search popular votes by keyword (German/French/Italian) |
| `get_vote_details` | Detailed per-district breakdown of a specific vote |

### 🌊 Dams & Reservoirs (3 tools)

| Tool | Description |
|------|-------------|
| `search_dams` | Search Swiss federal dams by name or keyword |
| `get_dams_by_canton` | List all federal dams in a canton |
| `get_dam_details` | Detailed info on a specific dam (height, volume, purpose) |

### 🥾 Hiking / Trail Closures (2 tools)

| Tool | Description |
|------|-------------|
| `get_trail_closures` | Swiss trail closures and hiking alerts from swisstopo |
| `get_trail_closures_nearby` | Trail closures near given coordinates |

### 🏠 Real Estate (3 tools)

| Tool | Description |
|------|-------------|
| `get_property_price_index` | Swiss property price index (BFS Immo-Monitoring) |
| `search_real_estate_data` | Search BFS real estate datasets on opendata.swiss |
| `get_rent_index` | Swiss rent index and housing cost data from BFS |

### 🚗 Traffic / ASTRA (3 tools)

| Tool | Description |
|------|-------------|
| `get_traffic_count` | Traffic counting station data (ASTRA) — daily volumes and heavy traffic share |
| `get_traffic_by_canton` | List ASTRA traffic counting stations filtered by canton |
| `get_traffic_nearby` | Find traffic counting stations near given coordinates |

### 🌍 Earthquakes / SED (3 tools)

| Tool | Description |
|------|-------------|
| `get_recent_earthquakes` | Recent seismic events in/around Switzerland from the Swiss Seismological Service (SED) at ETH Zürich |
| `get_earthquake_details` | Full details for a specific seismic event by SED event ID |
| `search_earthquakes_by_location` | Earthquakes near given coordinates with configurable radius, time range, and limit |

---

## Data Sources

All official Swiss open data — no API keys required:

| Source | Data | Docs |
|--------|------|------|
| [transport.opendata.ch](https://transport.opendata.ch) | SBB, PostBus, trams | [API docs](http://transport.opendata.ch/docs.html) |
| [api.existenz.ch](https://api.existenz.ch) | MeteoSwiss weather + BAFU hydrology | [API docs](https://api.existenz.ch) |
| [api3.geo.admin.ch](https://api3.geo.admin.ch) | swisstopo federal geodata | [API docs](https://api3.geo.admin.ch/api/doc.html) |
| [zefix.admin.ch](https://www.zefix.admin.ch) | Federal company registry | [Swagger](https://www.zefix.admin.ch/ZefixREST/swagger-ui.html) |
| [openholidaysapi.org](https://openholidaysapi.org) | Swiss public & school holidays | [API docs](https://openholidaysapi.org/swagger) |
| [ws.parlament.ch](https://ws.parlament.ch) | Swiss Parliament OData (bills, votes, councillors) | [OData docs](https://ws.parlament.ch/odata.svc/$metadata) |
| [whiterisk.ch](https://whiterisk.ch) / [aws.slf.ch](https://aws.slf.ch) | SLF/WSL avalanche bulletins | [SLF](https://www.slf.ch/en/avalanche-bulletin-and-snow-situation.html) |
| [geo.admin.ch](https://api3.geo.admin.ch) — BAFU/NABEL | Swiss air quality monitoring stations | [BAFU NABEL](https://www.bafu.admin.ch/bafu/en/home/topics/air/state/data/nabel.html) |
| [geo.admin.ch](https://api3.geo.admin.ch) — swisstopo | Swiss postcodes (Amtliches Ortschaftenverzeichnis) | [geo.admin.ch](https://api3.geo.admin.ch/api/doc.html) |
| [strompreis.elcom.admin.ch](https://strompreis.elcom.admin.ch) | ElCom electricity tariffs by municipality | [ElCom](https://www.elcom.admin.ch/elcom/en/home.html) |
| [pxweb.bfs.admin.ch](https://www.pxweb.bfs.admin.ch) + [opendata.swiss](https://opendata.swiss) | BFS population statistics (STATPOP) + datasets | [BFS](https://www.bfs.admin.ch/bfs/en/home/statistics/population.html) |
| [data.snb.ch](https://data.snb.ch) | Swiss National Bank CHF exchange rates | [SNB data portal](https://data.snb.ch/en) |
| [openerz.metaodi.ch](https://openerz.metaodi.ch) | Zurich waste collection calendar (OpenERZ) | [OpenERZ](https://openerz.metaodi.ch) |
| [srf.ch](https://www.srf.ch) | SRF Swiss news headlines | [SRF](https://www.srf.ch/news) |
| [data.bs.ch](https://data.bs.ch) | Basel-Stadt popular vote results | [Open Data BS](https://data.bs.ch) |
| [geo.admin.ch](https://api3.geo.admin.ch) — SFOE | Swiss federal dam registry | [SFOE](https://www.bfe.admin.ch) |
| [geo.admin.ch](https://api3.geo.admin.ch) — swisstopo | Swiss trail closures and hiking alerts | [swisstopo](https://www.swisstopo.admin.ch) |
| [pxweb.bfs.admin.ch](https://www.pxweb.bfs.admin.ch) | BFS property prices + rent index | [BFS housing](https://www.bfs.admin.ch/bfs/en/home/statistics/construction-housing.html) |
| [geo.admin.ch](https://api3.geo.admin.ch) — ASTRA | Traffic counting stations + daily volumes | [ASTRA](https://www.astra.admin.ch) |
| [arclink.ethz.ch](http://arclink.ethz.ch) | Swiss Seismological Service earthquakes (SED/ETH) | [SED](http://www.seismo.ethz.ch) |

---

## Development

```bash
# Clone
git clone https://github.com/vikramgorla/mcp-swiss.git
cd mcp-swiss

# Install deps
npm install

# Build
npm run build

# Run in dev mode
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### Testing

```bash
npm test
```

---

## Contributing

We welcome contributions! mcp-swiss follows a strict PR-based workflow to keep the codebase clean and CI always green.

### Quick links

- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — full contributor guide:
  - Development setup (clone, install, build, test)
  - Branch model (develop / main / feature branches)
  - Hard workflow rules (no direct pushes, always PRs, regular merge only)
  - Adding a new module (step-by-step with code templates)
  - Integration checklist (all files to update)
  - Code standards (TypeScript, no `any`, 50K response limit, zero API keys)

- **[`RELEASING.md`](RELEASING.md)** — release process for maintainers:
  - Step-by-step release workflow
  - Pre-release checklist
  - Version strategy (minor for features, patch for fixes)
  - Post-release verification
  - CI/CD workflow reference (`ci.yml`, `release.yml`, `beta.yml`, `mcp-registry.yml`)

---

## Requirements

- Node.js 20+
- No API keys or accounts needed

## License

MIT — see [LICENSE](LICENSE)
