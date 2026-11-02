#!/usr/bin/env node
import { readFileSync } from "fs";
import { join } from "path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  defaultAllowedHosts,
  isLoopbackBind,
  publicBindProblems,
  startHttpServer,
} from "./http-server.js";
import { createServer } from "./server.js";

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
import { snowTools, handleSnow } from "./modules/snow.js";
import { pollenTools, handlePollen } from "./modules/pollen.js";

// Single source of truth: version from package.json (dist/index.js -> ../package.json)
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
const VERSION = readVersion();

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
  snow:        { tools: snowTools,        handler: handleSnow },
  pollen:      { tools: pollenTools,     handler: handlePollen },
};

// ── Presets ───────────────────────────────────────────────────────────────────

export const presets: Record<string, string[]> = {
  commuter:  ["transport", "weather", "holidays"],
  outdoor:   ["weather", "avalanche", "hiking", "earthquakes", "dams", "snow"],
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
  /** Serve Streamable HTTP instead of stdio (--http or MCP_TRANSPORT=http). */
  http: boolean;
  port: number;
  host: string;
}

function flagValue(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx !== -1 ? argv[idx + 1] : undefined;
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

  const http = argv.includes("--http") || env.MCP_TRANSPORT?.toLowerCase() === "http";
  const port = Number(flagValue(argv, "--port") ?? env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    process.stderr.write(`Invalid port: ${flagValue(argv, "--port") ?? env.PORT}\n`);
    process.exit(1);
  }
  const host = flagValue(argv, "--host") ?? env.HOST ?? "127.0.0.1";

  return { modules: selectedModules, listModules, listPresets, http, port, host };
}

function parsePositiveInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    process.stderr.write(`${name} must be a positive integer, got: ${value}\n`);
    process.exit(1);
  }
  return parsed;
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
const moduleCount = activeModules.length;
const toolCount = allTools.length;
const summary = `${moduleCount} modules, ${toolCount} tools`;

function buildMcpServer() {
  return createServer({ version: VERSION, modules: activeModules });
}

async function main() {
  if (config.http) {
    const env = process.env;
    const allowedHosts = env.MCP_ALLOWED_HOSTS
      ? env.MCP_ALLOWED_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
      : defaultAllowedHosts(config.host, config.port);
    const authToken = env.MCP_AUTH_TOKEN || undefined;
    const problems = publicBindProblems({ host: config.host, authToken, allowedHosts });
    if (problems.length) {
      process.stderr.write(
        `Refusing to listen on ${config.host}: ${problems.join(" and ")}.\n` +
          "A server reachable from outside this machine needs a bearer token and a Host allow-list:\n" +
          "  MCP_AUTH_TOKEN=<secret> MCP_ALLOWED_HOSTS=mcp.example.ch:3000 ...\n" +
          "Or bind to loopback (--host 127.0.0.1) and put a reverse proxy in front.\n"
      );
      process.exit(1);
    }

    const httpServer = await startHttpServer({
      port: config.port,
      host: config.host,
      authToken,
      allowedHosts,
      corsOrigin: env.MCP_CORS_ORIGIN || undefined,
      maxSessions: parsePositiveInt(env.MCP_MAX_SESSIONS, "MCP_MAX_SESSIONS"),
      exposeSessionCount: isLoopbackBind(config.host),
      createMcpServer: buildMcpServer,
    });
    const shutdown = () => {
      httpServer.close(() => process.exit(0));
      httpServer.closeAllConnections();
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.stderr.write(
      `mcp-swiss ${VERSION} listening on http://${config.host}:${config.port}/mcp (${summary})\n`
    );
    return;
  }

  const server = buildMcpServer();
  await server.connect(new StdioServerTransport());
  process.stderr.write(`mcp-swiss ${VERSION} running on stdio (${summary})\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
