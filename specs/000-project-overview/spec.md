# Spec: mcp-swiss Project Overview

**Spec ID:** 000
**Status:** Implemented ✅
**Version:** 0.1.0
**Author:** Vikram Gorla
**Last Updated:** 2026-03-07

---

## Problem Statement

No comprehensive, zero-auth Swiss open data MCP server exists. AI assistants like Claude, Cursor, and Cline have no way to query Swiss public transport, MeteoSwiss weather, swisstopo geodata, or the ZEFIX company registry without custom integrations or API wrappers.

Developers integrating with Swiss data face:
- Multiple APIs with different conventions and response shapes
- No single MCP-compatible interface covering the breadth of Swiss open data
- No turnkey solution installable in 30 seconds via `npx`

## Business Value

- **First mover:** First comprehensive Swiss MCP server in the ecosystem
- **Zero friction:** `npx mcp-swiss` works immediately — no API keys, no registration, no server
- **AI-native:** Swiss data becomes conversational — "next train from Bern to Zürich", "is the Aare warm enough to swim?"
- **Open source community:** Canonical Swiss open data hub for AI assistants
- **Developer friendly:** TypeScript, clean interfaces, full test suite, Speckit specs, MIT license

## Scope

### In Scope (v0.1.0)

| Module | Tools | API Source | Spec |
|--------|-------|------------|------|
| Transport | 5 | transport.opendata.ch | `specs/001-transport-module/` |
| Weather & Hydrology | 6 | api.existenz.ch (MeteoSwiss + BAFU) | `specs/002-weather-module/` |
| Geodata / swisstopo | 6 | api3.geo.admin.ch | `specs/003-geodata-module/` |
| Companies / ZEFIX | 5 | zefix.admin.ch | `specs/004-companies-module/` |

**Total: 22 tools, 4 modules, zero authentication**

### Non-Goals (v0.1.0)

- No paid API integrations (SBB Premium, commercial weather APIs)
- No authentication flows — all APIs publicly accessible
- No server hosting — stdio transport only, runs locally via `npx`
- No Swiss-language output (German/French/Italian) — English only
- No caching layer — direct API calls per invocation
- No rate limiting management — rely on upstream limits

## Architecture

```
AI Assistant (Claude / Cursor / Cline / any MCP client)
         │
         │  MCP Protocol (stdio JSON-RPC)
         ▼
    mcp-swiss (node dist/index.js)
         │
    ┌────┴──────────────────────────────┐
    │           Tool Router             │
    └────┬──────┬──────┬───────────────┘
         │      │      │         │
    Transport  Weather  Geodata  Companies
         │      │      │         │
    transport  api.   api3.geo  zefix.admin
    .opendata  existenz .admin   .ch
    .ch        .ch     .ch
```

## Project Structure

```
src/
  index.ts              # Server entry — tool registration + routing
  modules/
    transport.ts        # 5 transport tools
    weather.ts          # 6 weather + hydrology tools
    geodata.ts          # 6 geodata tools
    companies.ts        # 5 company registry tools
  utils/
    http.ts             # fetchJSON<T>() + buildUrl() helpers

tests/
  unit/                 # mocked, ~9s, always run in CI
  integration/          # live APIs, run on push to main/develop
  mcp/                  # MCP protocol conformance (12 assertions)
  fixtures/             # mock data per module

specs/                  # Speckit spec-driven development
  000-project-overview/ # this file
  001-transport-module/ # spec + plan + tasks
  002-weather-module/
  003-geodata-module/
  004-companies-module/

docs/
  tool-specs.md         # human-readable spec for all 22 tools
  tools.schema.json     # machine-readable JSON schema

.specify/
  commands/             # AI slash command definitions
    speckit.specify.md  # /specify — generate a new spec
    speckit.plan.md     # /plan — generate plan from spec
    speckit.tasks.md    # /tasks — generate task list from plan

.github/
  workflows/
    ci.yml              # lint + build (Node 18/20/22) + unit tests + integration + audit
    release.yml         # tag → GitHub release + npm publish stub
  ISSUE_TEMPLATE/       # bug report + feature request (YAML forms)
  CONTRIBUTING.md       # spec-driven workflow, testing, code style
  SECURITY.md
  SUPPORT.md
  PULL_REQUEST_TEMPLATE.md
  CODEOWNERS
  FUNDING.yml
```

## Success Criteria

- [x] All 22 tools respond correctly to MCP tool calls
- [x] `npx mcp-swiss` works on Node.js 18, 20, 22
- [x] Unit test suite passes — 104 tests in ~9s (zero real API calls)
- [x] Integration tests pass against live Swiss APIs — 27 tests
- [x] MCP protocol conformance test — 12 assertions
- [x] CI passes on GitHub Actions (lint + build + test + integration + security audit)
- [x] Full Speckit spec-driven structure for all 4 modules
- [x] Tool specs in `docs/tool-specs.md` and `docs/tools.schema.json`
- [x] README with demo prompts + client config examples (Claude Desktop, Cursor, Cline)
- [ ] Published to npm as `mcp-swiss`
- [ ] Works in Claude Desktop end-to-end (npx test)

## Constraints

- TypeScript for type safety and IDE support
- `@modelcontextprotocol/sdk` for MCP compliance
- No external runtime dependencies beyond Node.js built-ins and MCP SDK
- All API calls via native `fetch` (Node 18+)
- ESLint with `@typescript-eslint/no-explicit-any` enforced
- MIT license
