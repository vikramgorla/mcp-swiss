# Installing mcp-swiss

## Prerequisites
- Node.js 18+

## Quick Start
```bash
npx mcp-swiss
```

## Configuration for AI Platforms

### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):
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

### VS Code / GitHub Copilot
Add to `.vscode/mcp.json`:
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

### Cursor
Add to `~/.cursor/mcp.json`:
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

### Cline
Add to VS Code `settings.json`:
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

### Amazon Q Developer
Add to `~/.aws/amazonq/mcp.json`:
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

## No API Keys Required
All data sources are free Swiss public APIs. No registration or authentication needed.
