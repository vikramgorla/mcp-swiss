#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  annotationsFor,
  callTool,
  DISCOVERY_TOOLS,
  discoveryEnabled,
  listModules,
  searchTools,
  SEARCH_TOOLS_TOOL,
  CALL_TOOL,
  LIST_MODULES_TOOL,
} from "./discovery.js";
import { moduleRegistry, presets, resolveModules, type ToolHandler } from "./registry.js";
import { errorMessage } from "./utils/errors.js";
import { VERSION } from "./utils/http.js";
import { validateArgs, type ValidatableTool } from "./utils/validate.js";

export { moduleRegistry, presets, resolveModules };
export type { ModuleEntry, ToolHandler } from "./registry.js";

// Every tool is a read-only lookup against a public Swiss open-data API.
const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

export interface ParsedArgs {
  modules: Set<string> | null;
  listModules: boolean;
  listPresets: boolean;
  discovery: boolean;
}

export function parseArgs(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): ParsedArgs {
  const listModules = argv.includes("--list-modules");
  const listPresets = argv.includes("--list-presets");

  let selectedModules: Set<string> | null = null;

  // Parse --preset
  const presetIdx = argv.indexOf("--preset");
  if (presetIdx !== -1 && argv[presetIdx + 1]) {
    const presetName = argv[presetIdx + 1];
    if (!presets[presetName]) {
      process.stderr.write(
        `Unknown preset: ${presetName}\nAvailable: ${Object.keys(presets).join(", ")}\n`
      );
      process.exit(1);
    }
    selectedModules = new Set(presets[presetName]);
  }

  // Parse --modules (additive with preset)
  const modulesIdx = argv.indexOf("--modules");
  if (modulesIdx !== -1 && argv[modulesIdx + 1]) {
    const moduleNames = argv[modulesIdx + 1].split(",").map((m) => m.trim());
    const invalid = moduleNames.filter((m) => !moduleRegistry[m]);
    if (invalid.length) {
      process.stderr.write(
        `Unknown modules: ${invalid.join(", ")}\nAvailable: ${Object.keys(moduleRegistry).join(", ")}\n`
      );
      process.exit(1);
    }
    if (selectedModules) {
      moduleNames.forEach((m) => selectedModules!.add(m));
    } else {
      selectedModules = new Set(moduleNames);
    }
  }

  return { modules: selectedModules, listModules, listPresets, discovery: discoveryEnabled(argv, env) };
}

// ── List Helpers ─────────────────────────────────────────────────────────────

function printModules(): void {
  process.stdout.write("\nAvailable modules:\n\n");
  for (const [name, mod] of Object.entries(moduleRegistry)) {
    process.stdout.write(
      `  ${name.padEnd(14)} ${String(mod.tools.length).padStart(2)} tools  ${mod.description}\n`
    );
  }
  process.stdout.write(
    "\nUsage: npx mcp-swiss --modules transport,weather\n\n"
  );
}

function printPresets(): void {
  process.stdout.write("\nAvailable presets:\n\n");
  for (const [name, modules] of Object.entries(presets)) {
    const toolCount = modules.reduce(
      (sum, m) => sum + (moduleRegistry[m]?.tools.length || 0),
      0
    );
    process.stdout.write(
      `  ${name.padEnd(12)} ${String(toolCount).padStart(3)} tools  [${modules.join(", ")}]\n`
    );
  }
  process.stdout.write("\nUsage: npx mcp-swiss --preset commuter\n");
  process.stdout.write(
    "Combine: npx mcp-swiss --preset commuter --modules parliament\n\n"
  );
}

// ── Resolve Active Modules ───────────────────────────────────────────────────

// ── Main ─────────────────────────────────────────────────────────────────────

const config = parseArgs();

if (config.listModules) {
  printModules();
  process.exit(0);
}
if (config.listPresets) {
  printPresets();
  process.exit(0);
}

const activeModules = resolveModules(config.modules);
const allTools = activeModules.flatMap((m) => m.tools);

// Build tool → handler lookup
const toolHandlerMap = new Map<string, ToolHandler>();
for (const mod of activeModules) {
  for (const tool of mod.tools) {
    toolHandlerMap.set(tool.name, mod.handler);
  }
}

const server = new Server(
  { name: "mcp-swiss", version: VERSION },
  { capabilities: { tools: {} } }
);

const listedTools = config.discovery
  ? DISCOVERY_TOOLS.map((tool) => ({ ...tool, annotations: annotationsFor(tool) }))
  : allTools.map((tool) => ({ ...tool, annotations: TOOL_ANNOTATIONS }));

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: listedTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args ?? {}) as Record<string, unknown>;

  try {
    let result: string;
    if (config.discovery && name === SEARCH_TOOLS_TOOL.name) {
      result = searchTools(activeModules, safeArgs);
    } else if (config.discovery && name === LIST_MODULES_TOOL.name) {
      result = listModules(activeModules);
    } else if (config.discovery && name === CALL_TOOL.name) {
      result = await callTool(activeModules, safeArgs);
    } else if (config.discovery) {
      throw new Error(
        `Tool ${name} is not listed in discovery mode. Use swiss_search_tools, then swiss_call_tool.`
      );
    } else {
      const handler = toolHandlerMap.get(name);
      if (!handler) throw new Error(`Unknown tool: ${name}`);
      const definition = allTools.find((tool) => tool.name === name) as ValidatableTool | undefined;
      const validated = definition ? validateArgs(definition, safeArgs) : safeArgs;
      result = await handler(name, validated);
    }
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${errorMessage(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const moduleCount = activeModules.length;
  const toolCount = config.discovery ? DISCOVERY_TOOLS.length : allTools.length;
  const mode = config.discovery ? ", discovery" : "";
  process.stderr.write(
    `mcp-swiss running on stdio (${moduleCount} modules, ${toolCount} tools${mode})\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
