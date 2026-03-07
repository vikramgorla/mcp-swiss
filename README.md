# mcp-swiss 🏔️

[![CI](https://github.com/vikramgorla/mcp-swiss/actions/workflows/ci.yml/badge.svg)](https://github.com/vikramgorla/mcp-swiss/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mcp-swiss.svg)](https://www.npmjs.com/package/mcp-swiss)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)

Swiss open data MCP server for AI assistants. Zero API keys. Zero config. Just works.

## What is this?

`mcp-swiss` is a [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI assistants (Claude, Cursor, Cline, etc.) direct access to Swiss open data:

- 🚆 **Transport** — SBB trains, PostBus, trams, live departures, journey planning
- 🌤️ **Weather** — MeteoSwiss live conditions + historical data
- 🌊 **Hydrology** — BAFU river and lake levels (great for Aare swimming!)
- 🗺️ **Geodata** — swisstopo geocoding, solar potential, geographic layers
- 🏢 **Companies** — ZEFIX federal registry, all 700K+ Swiss companies

**23 tools. No API keys. No registration. No server to run.**

## Install

```bash
npx mcp-swiss
```

## Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["mcp-swiss"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Create or edit `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["mcp-swiss"]
    }
  }
}
```

### Cline (VSCode)

Open VSCode settings (`Cmd+,`), search for `cline.mcpServers`, and add:

```json
{
  "swiss": {
    "command": "npx",
    "args": ["mcp-swiss"],
    "disabled": false,
    "autoApprove": []
  }
}
```

Or edit `settings.json` directly:

```json
{
  "cline.mcpServers": {
    "swiss": {
      "command": "npx",
      "args": ["mcp-swiss"]
    }
  }
}
```

## Demo Prompts

Once connected, try asking your AI:

- *"Next 5 trains from Zürich HB to Geneva right now"*
- *"Is the Aare in Bern warm enough to swim? What's the level?"*
- *"Weather in Lugano vs Zürich today"*
- *"Find all companies with 'blockchain' in their name registered in Zug"*
- *"What's the solar potential of Bundesplatz 3, Bern?"*
- *"Live departures from Bern HB in the next 30 minutes"*
- *"Plan my Saturday: train to Interlaken, check weather, nearest SBB station"*

## Tools

### Transport (5 tools)
| Tool | Description |
|------|-------------|
| `search_stations` | Find stations/stops by name or location |
| `get_connections` | Journey planner between any two points |
| `get_departures` | Live departures from a station |
| `get_arrivals` | Live arrivals at a station |
| `get_nearby_stations` | Stations near coordinates |

### Weather & Hydrology (6 tools)
| Tool | Description |
|------|-------------|
| `get_weather` | Current conditions at a MeteoSwiss station |
| `list_weather_stations` | All ~160 weather stations |
| `get_weather_history` | Historical weather data |
| `get_water_level` | River/lake level + temperature |
| `list_hydro_stations` | All 400+ hydro stations |
| `get_water_history` | Historical hydrology data |

### Geodata / swisstopo (6 tools)
| Tool | Description |
|------|-------------|
| `geocode` | Address → coordinates |
| `reverse_geocode` | Coordinates → address |
| `search_places` | Swiss place names and geographic features |
| `get_solar_potential` | Rooftop solar irradiation at a location |
| `identify_location` | All geo data at a point |
| `get_municipality` | Municipality info by name |

### Companies / ZEFIX (5 tools)
| Tool | Description |
|------|-------------|
| `search_companies` | Search by name, canton, legal form |
| `get_company` | Full details by ZEFIX `ehraid` (from search results) |
| `search_companies_by_address` | Companies at an address |
| `list_cantons` | All Swiss cantons |
| `list_legal_forms` | AG, GmbH, and all legal forms |

## Data Sources

All official Swiss open data, no API keys required:
- [transport.opendata.ch](https://transport.opendata.ch) — Swiss public transport
- [api.existenz.ch](https://api.existenz.ch) — MeteoSwiss + BAFU (weather + hydrology)
- [api3.geo.admin.ch](https://api3.geo.admin.ch) — swisstopo geodata
- [zefix.admin.ch](https://www.zefix.admin.ch) — Federal company registry

## Requirements

- Node.js 18+
- No API keys or accounts needed

## License

MIT
