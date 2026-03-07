# Installation Guide

> `mcp-swiss` works with any MCP-compatible AI client. No API keys needed.

## Quick Start

```bash
npx mcp-swiss
```

That's it. Pick your client below.

---

## Claude Desktop

Edit your Claude Desktop config file:

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Add `mcp-swiss` to the `mcpServers` object:

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

> 💡 If you already have other MCP servers, just add the `"swiss"` entry alongside them.

**Restart Claude Desktop** after saving the file.

### Verifying it works

After restarting, you should see a 🔌 icon or "Tools" indicator in Claude Desktop. Click it to confirm `swiss` is listed. Then try:

> "What's the weather in Zürich right now?"

---

## Claude Code (CLI)

```bash
claude mcp add swiss -- npx -y mcp-swiss
```

To verify:

```bash
claude mcp list
```

You should see `swiss` listed. Start a new Claude Code session to use it.

---

## Cursor

> Requires Cursor 0.45.6+

### Option A: Project config (recommended for teams)

Create `.cursor/mcp.json` in your project root:

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

### Option B: Global config

Create `~/.cursor/mcp.json`:

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

### Option C: Via Cursor UI

1. Open Cursor Settings (`Cmd+,` / `Ctrl+,`)
2. Go to **Features → MCP Servers**
3. Click **+ Add new global MCP server**
4. Paste the JSON config above

After adding, refresh the MCP server list. The Composer Agent will automatically use Swiss tools when relevant. Access the Composer via `Cmd+L` (Mac) / `Ctrl+L` (Windows), select "Agent" mode, and ask your question.

---

## VS Code (GitHub Copilot)

### One-click Install

Click to install directly:

- **[Install in VS Code](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522swiss%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522mcp-swiss%2522%255D%257D)**
- **[Install in VS Code Insiders](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522swiss%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522mcp-swiss%2522%255D%257D)**

### CLI Install

```bash
# VS Code
code --add-mcp '{"name":"swiss","command":"npx","args":["-y","mcp-swiss"]}'

# VS Code Insiders
code-insiders --add-mcp '{"name":"swiss","command":"npx","args":["-y","mcp-swiss"]}'
```

### Manual Config

Press `Ctrl+Shift+P` → **Preferences: Open User Settings (JSON)** and add:

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

Or create `.vscode/mcp.json` in your workspace (shareable with your team):

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

## Windsurf

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

## Cline (VS Code Extension)

Open VS Code `settings.json` (`Ctrl+Shift+P` → **Preferences: Open User Settings (JSON)**) and add:

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

## OpenClaw

If you're using [OpenClaw](https://openclaw.app), add to your workspace `TOOLS.md` or configure via the OpenClaw CLI:

```bash
openclaw mcp add swiss npx -y mcp-swiss
```

---

## Any Other MCP Client

`mcp-swiss` uses **stdio transport** with no environment variables. The universal config shape is:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-swiss"]
}
```

This works with any MCP client that supports stdio transport — just plug it into your client's MCP server configuration.

---

## Troubleshooting

### "npx: command not found"

Install Node.js 18+ from [nodejs.org](https://nodejs.org). npm (which includes npx) comes bundled.

### Server not showing up in Claude Desktop

1. Make sure you edited the correct config file (check the path for your OS)
2. Ensure valid JSON — use a JSON validator if unsure
3. **Restart Claude Desktop completely** (quit and reopen, not just close the window)

### Server starts but no tools appear

Run manually to check for errors:

```bash
npx -y mcp-swiss
```

You should see the MCP server start on stdio. If you see errors, please [open an issue](https://github.com/vikramgorla/mcp-swiss/issues).

### Windows-specific issues

If you encounter issues on Windows, try using the full path to npx:

```json
{
  "mcpServers": {
    "swiss": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "mcp-swiss"]
    }
  }
}
```

### Testing with MCP Inspector

Use the official MCP Inspector to verify the server works:

```bash
npx @modelcontextprotocol/inspector npx -y mcp-swiss
```

This opens a web UI where you can browse all tools and test them interactively.

---

## Requirements

- **Node.js 18+** (with npm/npx)
- **No API keys** — all data sources are free Swiss open data
- **No accounts** — nothing to sign up for
- **No server** — runs locally via stdio
