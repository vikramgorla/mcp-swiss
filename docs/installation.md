# Installation

See the [Installation section](../README.md#installation) in the README for complete setup instructions for all supported clients (Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, Cline, and more).

## Quick Start

```bash
npx mcp-swiss
```

No API keys, no `.env` files, no accounts needed.

## Local HTTP

`npx mcp-swiss --http` serves Streamable HTTP on `127.0.0.1:3000` at `/mcp`. A non-loopback bind refuses to start unless `MCP_AUTH_TOKEN` and `MCP_ALLOWED_HOSTS` are both set. See the README. This does not include a hosted deployment.
