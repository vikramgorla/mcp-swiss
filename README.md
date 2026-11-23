<div align="center">

<img src="assets/icon.svg" width="96" height="96" alt="mcp-swiss" />

# mcp-swiss

**Swiss public data for AI assistants. No API keys.**

[![npm](https://img.shields.io/npm/v/mcp-swiss.svg?style=flat-square)](https://www.npmjs.com/package/mcp-swiss)
[![CI](https://img.shields.io/github/actions/workflow/status/vikramgorla/mcp-swiss/ci.yml?style=flat-square&label=CI)](https://github.com/vikramgorla/mcp-swiss/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dm/mcp-swiss.svg?style=flat-square)](https://www.npmjs.com/package/mcp-swiss)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.vikramgorla%2Fswiss-D52B1E?style=flat-square)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.vikramgorla/swiss)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**[Documentation and tool catalogue](https://vikramgorla.github.io/mcp-swiss/)**

</div>

An [MCP](https://modelcontextprotocol.io) server that gives Claude, Copilot, Cursor and other assistants 95 tools across 27 modules for Swiss public data:

- **Getting around:** SBB and PostBus timetables, live departures, station passengers, punctuality and step-free access, road traffic counts
- **Weather and nature:** MeteoSwiss weather and measurements, river and lake levels, avalanche bulletins, snow, pollen, air quality, earthquakes, dams, hiking trail closures
- **Places:** geocoding, places, municipalities, postcodes, rooftop solar potential, the federal buildings register, every geo.admin map layer
- **Society and economy:** the commercial register, public and school holidays, federal and cantonal parliament, popular votes, population, property and consumer prices, SNB exchange rates, electricity tariffs, SRF news, Zurich waste collection, the opendata.swiss catalogue

Every tool reads official or long-running public sources. Nothing needs an account.

## Install

**Claude Desktop:** download [mcp-swiss.mcpb](https://github.com/vikramgorla/mcp-swiss/releases/latest/download/mcp-swiss.mcpb) and open it.

**Claude Code:**

```bash
claude mcp add swiss -- npx -y mcp-swiss
```

**Cursor, VS Code, Windsurf, Cline and any other MCP app:**

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

Requires Node.js 20 or later. Per-app steps, Docker images and the Streamable HTTP mode are on the [install page](https://vikramgorla.github.io/mcp-swiss/#install).

## How tools are listed

**You don't need to configure anything.** Out of the box, mcp-swiss lists five tools instead of 95 and tells the model how to reach the rest. That costs about 1,200 tokens per conversation instead of about 11,700.

| Listed by default | What it does |
|---|---|
| `swiss_search_tools` | Finds the right tool from plain words ("train from Aigle to Geneva", "avalanche danger Verbier", "CHF to EUR"), typos included, and returns its input schema |
| `swiss_call_tool` | Runs any tool by name after checking its arguments |
| `swiss_list_modules` | The full catalogue, module by module |
| `get_connections`, `get_departures` | The two most-used tools, callable directly |

The server's `instructions` (which apps add to the model's context) list every module, so the model knows what exists before it searches. All tools only read public data, so apps can approve calls without asking each time. This is the search-then-execute pattern used by [Atlassian's Rovo MCP server](https://developer.atlassian.com/cloud/rovo-mcp/guides/supported-tools/) and [Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/codemode/), with [Anthropic's advice](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) to keep a few frequent tools loaded. A test asks more than 200 plain-language questions, at least two per tool, and fails if any tool doesn't come up in the top five results.

| Add to `args` | What you get |
|---|---|
| *(nothing)* | Search mode, as above |
| `--modules transport,weather` | Only those modules, listed directly (`--list-modules` shows all 27) |
| `--preset commuter` | A ready-made set: `commuter`, `outdoor`, `business`, `citizen`, `minimal` (`--list-presets`) |
| `--mode full` or `MCP_SWISS_MODE=full` | All 95 tools listed directly. Fine in apps that already load tools on demand, such as Claude Code |
| `--discovery` | Search mode even when modules are chosen |
| `--pin get_weather,geocode` / `--pin none` | Different tools next to the search tools, or only the three |

## Try asking

- *Next trains from Aigle to Geneva airport*
- *Is the Aare in Bern warm enough to swim?*
- *What's the avalanche danger around Verbier today?*
- *Find companies registered in Zug with "blockchain" in the name*
- *Rooftop solar potential of Bundesplatz 3, Bern*
- *When are the autumn school holidays in Vaud?*
- *How much does electricity cost in Lausanne compared with Zurich?*
- *What has parliament decided about pensions this year?*

## Tools and data sources

The [tool catalogue](https://vikramgorla.github.io/mcp-swiss/#tools) lists all 94 tools with their parameters and has a search box that runs the server's own search. It's generated from the code on every release. The same information is machine-readable in [`docs/tools.schema.json`](docs/tools.schema.json). Sources and their licences are listed on the [data sources page](https://vikramgorla.github.io/mcp-swiss/#sources).

## Development

```bash
git clone https://github.com/vikramgorla/mcp-swiss.git
cd mcp-swiss
npm install
npm run validate                         # lint, build, unit and protocol tests
npx @modelcontextprotocol/inspector node dist/index.js
npm run site                             # build the documentation site into site/dist
```

[`AGENTS.md`](AGENTS.md) holds the rules every change follows. [`CONTRIBUTING.md`](CONTRIBUTING.md) walks through adding a module, and [`RELEASING.md`](RELEASING.md) covers releases. Upstream calls time out after 30 seconds (`MCP_SWISS_TIMEOUT_MS`) and retry once on a dropped connection or rate limit.

Thanks to Pierre Christen ([netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng)) for the HTTP transport, the building register and many data fixes, and to everyone who has reported issues.

## License

MIT. See [LICENSE](LICENSE). Not affiliated with the Swiss federal administration, SBB or any data provider.
