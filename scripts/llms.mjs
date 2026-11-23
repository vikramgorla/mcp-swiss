#!/usr/bin/env node
// Generates llms.txt (https://llmstxt.org) from the compiled registry, so the
// counts and module list always match the code.
//   node scripts/llms.mjs            -> writes ./llms.txt
//   node scripts/llms.mjs --check    -> exits 1 if ./llms.txt is out of date
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export function renderLlms(root = process.cwd()) {
  const require = createRequire(join(root, "package.json"));
  const { resolveModules } = require("./dist/registry.js");
  const modules = resolveModules(null);
  const tools = modules.reduce((n, m) => n + m.tools.length, 0);
  const lines = [
    "# mcp-swiss",
    "",
    `> Swiss public data MCP server: ${tools} read-only tools in ${modules.length} modules, no API keys.`,
    "",
    "By default the server lists swiss_search_tools, swiss_call_tool, swiss_list_modules, get_connections and get_departures. Search for any other tool in plain words, then call it with swiss_call_tool. Use --mode full to list every tool directly.",
    "",
    "## Install",
    "",
    "- `npx -y mcp-swiss` (stdio; any MCP client)",
    "- `claude mcp add swiss -- npx -y mcp-swiss` (Claude Code)",
    "- `npx -y mcp-swiss --http` (Streamable HTTP on 127.0.0.1:3000/mcp)",
    "",
    `## Modules (${modules.length})`,
    "",
    ...modules.map((m) => `- ${m.name} (${m.tools.length}): ${m.description ?? ""}. Tools: ${m.tools.map((t) => t.name).join(", ")}`),
    "",
    "## Docs",
    "",
    "- [Documentation and tool catalogue](https://vikramgorla.github.io/mcp-swiss/): every tool with its parameters",
    "- [Machine-readable tool schemas](https://github.com/vikramgorla/mcp-swiss/blob/main/docs/tools.schema.json)",
    "- [Install guide for AI agents](https://github.com/vikramgorla/mcp-swiss/blob/main/llms-install.md)",
    "- [npm](https://www.npmjs.com/package/mcp-swiss)",
    "- [Source](https://github.com/vikramgorla/mcp-swiss)",
    "",
  ];
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const path = join(process.cwd(), "llms.txt");
  const fresh = renderLlms();
  if (process.argv.includes("--check")) {
    const current = readFileSync(path, "utf8");
    if (current !== fresh) {
      console.error("llms.txt is out of date. Run: npm run build && node scripts/llms.mjs");
      process.exit(1);
    }
    console.log("llms.txt is up to date");
  } else {
    writeFileSync(path, fresh);
    console.log(`wrote ${path}`);
  }
}
