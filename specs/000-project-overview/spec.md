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
- Multiple different APIs with different auth schemes, response shapes, and conventions
- No single MCP-compatible interface covering the breadth of Swiss open data
- No turnkey solution installable in 30 seconds via `npx`

## Business Value

- **First mover:** First comprehensive Swiss MCP server in the ecosystem
- **Zero friction:** `npx mcp-swiss` works immediately — no API keys, no registration, no server to deploy
- **AI-native:** Swiss data becomes conversational — "next train from Bern to Zürich", "is the Aare warm enough to swim?"
- **Open source community:** Establishes mcp-swiss as the canonical Swiss open data hub for AI assistants
- **Developer friendly:** TypeScript, clean interfaces, full test suite, MIT license

## Scope

### In Scope (v0.1.0)

| Module | Tools | API Source |
|--------|-------|------------|
| Transport | 5 tools | transport.opendata.ch |
| Weather & Hydrology | 6 tools | api.existenz.ch (MeteoSwiss + BAFU) |
| Geodata / swisstopo | 6 tools | api3.geo.admin.ch |
| Companies / ZEFIX | 5 tools | zefix.admin.ch |

**Total: 22 tools, 4 modules, zero authentication**

### Non-Goals (v0.1.0)

- No paid API integrations (e.g. SBB Premium, commercial weather)
- No authentication flows — all APIs must be publicly accessible
- No server hosting — stdio transport only, runs locally via `npx`
- No Swiss-specific language support (German/French/Italian) — English output
- No caching layer — direct API calls on each invocation
- No rate limiting management — rely on source API limits
- No webhook or push notifications

## Architecture

```
AI Assistant (Claude/Cursor/Cline)
         │
         │ MCP Protocol (stdio)
         ▼
    mcp-swiss server
         │
    ┌────┴─────┐
    │  Router  │
    └────┬─────┘
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    ▼           ▼           ▼             ▼
Transport   Weather      Geodata      Companies
    │           │           │             │
    ▼           ▼           ▼             ▼
transport.  api.existenz  api3.geo.   zefix.admin
opendata.ch    .ch        admin.ch        .ch
```

## Success Criteria

- [ ] All 22 tools respond correctly to MCP tool calls
- [ ] `npx mcp-swiss` works on Node.js 18, 20, 22
- [ ] Unit test suite passes (zero API calls)
- [ ] Integration tests pass against live Swiss APIs
- [ ] CI passes on GitHub Actions (lint + build + test)
- [ ] Published to npm as `mcp-swiss`
- [ ] README covers all tools with examples
- [ ] Works in Claude Desktop, Cursor, Cline

## Constraints

- TypeScript for type safety and IDE support
- @modelcontextprotocol/sdk for MCP compliance
- No external runtime dependencies beyond Node.js built-ins and the MCP SDK
- All API calls via native `fetch` (Node 18+)
- MIT license
