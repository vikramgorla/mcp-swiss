#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { transportTools, handleTransport } from "./modules/transport.js";
import { weatherTools, handleWeather } from "./modules/weather.js";
import { geodataTools, handleGeodata } from "./modules/geodata.js";
import { companiesTools, handleCompanies } from "./modules/companies.js";
import { holidaysTools, handleHolidays } from "./modules/holidays.js";
import { parliamentTools, handleParliament } from "./modules/parliament.js";
import { avalancheTools, handleAvalanche } from "./modules/avalanche.js";
import { airqualityTools, handleAirQuality } from "./modules/airquality.js";
import { postTools, handlePost } from "./modules/post.js";
import { energyTools, handleEnergy } from "./modules/energy.js";
import { statisticsTools, handleStatistics } from "./modules/statistics.js";
import { snbTools, handleSnb } from "./modules/snb.js";
import { recyclingTools, handleRecycling } from "./modules/recycling.js";
import { newsTools, handleNews } from "./modules/news.js";
import { votingTools, handleVoting } from "./modules/voting.js";
import { damsTools, handleDams } from "./modules/dams.js";
import { hikingTools, handleHiking } from "./modules/hiking.js";
import { realEstateTools, handleRealEstate } from "./modules/realestate.js";
import { trafficTools, handleTraffic } from "./modules/traffic.js";
import { earthquakeTools, handleEarthquakes } from "./modules/earthquakes.js";

// ── Module Registry ──────────────────────────────────────────────────────────

type ToolHandler = (name: string, args: Record<string, unknown>) => Promise<string>;

interface ModuleEntry {
  tools: Array<{ name: string; description: string; inputSchema: object }>;
  handler: ToolHandler;
}

export const moduleRegistry: Record<string, ModuleEntry> = {
  transport:   { tools: transportTools,   handler: handleTransport },
  weather:     { tools: weatherTools,     handler: handleWeather },
  geodata:     { tools: geodataTools,     handler: handleGeodata },
  companies:   { tools: companiesTools,   handler: handleCompanies },
  holidays:    { tools: holidaysTools,    handler: handleHolidays },
  parliament:  { tools: parliamentTools,  handler: handleParliament },
  avalanche:   { tools: avalancheTools,   handler: handleAvalanche as ToolHandler },
  airquality:  { tools: airqualityTools,  handler: handleAirQuality },
  post:        { tools: postTools,        handler: handlePost },
  energy:      { tools: energyTools,      handler: handleEnergy },
  statistics:  { tools: statisticsTools,  handler: handleStatistics },
  snb:         { tools: snbTools,         handler: handleSnb },
  recycling:   { tools: recyclingTools,   handler: handleRecycling },
  news:        { tools: newsTools,        handler: handleNews },
  voting:      { tools: votingTools,      handler: handleVoting },
  dams:        { tools: damsTools,        handler: handleDams },
  hiking:      { tools: hikingTools,      handler: handleHiking },
  realestate:  { tools: realEstateTools,  handler: handleRealEstate },
  traffic:     { tools: trafficTools,     handler: handleTraffic },
  earthquakes: { tools: earthquakeTools,  handler: handleEarthquakes as ToolHandler },
};

// ── Presets ───────────────────────────────────────────────────────────────────

export const presets: Record<string, string[]> = {
  commuter:  ["transport", "weather", "holidays"],
  outdoor:   ["weather", "avalanche", "hiking", "earthquakes", "dams"],
  business:  ["companies", "geodata", "post", "energy", "statistics", "snb"],
  citizen:   ["parliament", "voting", "holidays", "news"],
  minimal:   ["transport"],
  full:      Object.keys(moduleRegistry),
};

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

export interface ParsedArgs {
  modules: Set<string> | null;
  listModules: boolean;
  listPresets: boolean;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
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

  return { modules: selectedModules, listModules, listPresets };
}

// ── List Helpers ─────────────────────────────────────────────────────────────

function printModules(): void {
  process.stdout.write("\nAvailable modules:\n\n");
  for (const [name, mod] of Object.entries(moduleRegistry)) {
    process.stdout.write(
      `  ${name.padEnd(14)} ${mod.tools.length} tools\n`
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

export function resolveModules(
  selected: Set<string> | null
): Array<{ name: string } & ModuleEntry> {
  const names = selected ? [...selected] : Object.keys(moduleRegistry);
  return names
    .filter((n) => moduleRegistry[n])
    .map((n) => ({ name: n, ...moduleRegistry[n] }));
}

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
  { name: "mcp-swiss", version: "0.5.8" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args ?? {}) as Record<string, unknown>;

  try {
    const handler = toolHandlerMap.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await handler(name, safeArgs);
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const moduleCount = activeModules.length;
  const toolCount = allTools.length;
  process.stderr.write(
    `mcp-swiss running on stdio (${moduleCount} modules, ${toolCount} tools)\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
