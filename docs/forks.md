# Forks and derivatives

The maintenance pass reviews these and ports useful work with credit (see `.claude/agents/maintainer.md`, step 6). Start each review from the last commit listed here.

| Fork | Last commit reviewed | Outcome |
|---|---|---|
| [netadvanced/mcp-swiss-ng](https://github.com/netadvanced/mcp-swiss-ng) (Pierre Christen) | `2dd3b1b` (2026-09-21) | Most of it ported in 0.9.0 (HTTP transport, building register, discovery mode, shared HTTP client, validation, data fixes). Ported in 0.10.0: pinned and checksummed `mcp-publisher`, MCP SDK kept out of Dependabot auto-merge (#245), dead files removed (#246). Not ported: `23826e9` marks `swiss_call_tool` as not read-only; this repo marks it read-only because every tool it runs is read-only (guarded by a test). Fork-only rebranding, publishing and CODEOWNERS commits don't apply. |
| [mcp-orionis/mcp-swiss](https://github.com/mcp-orionis/mcp-swiss) | upstream as of 2026-03-15 | No commits of its own. |
| [iflow-mcp/vikramgorla-mcp-swiss](https://github.com/iflow-mcp/vikramgorla-mcp-swiss) | upstream as of 2026-03-15 | Mirror, no commits of its own. |
| [ElishaKay/mcp-swiss](https://github.com/ElishaKay/mcp-swiss) | upstream as of 2026-03-15 | No commits of its own. |

Reviewed 2026-11-23.
