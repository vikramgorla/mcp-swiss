#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { discoveryEnabled } from "./discovery.js";
import {
  defaultAllowedHosts,
  isLoopbackBind,
  publicBindProblems,
  startHttpServer,
} from "./http-server.js";
import { moduleRegistry, presets, resolveModules } from "./registry.js";
import { createServer } from "./server.js";
import { VERSION } from "./utils/http.js";

export { moduleRegistry, presets, resolveModules };
export type { ModuleEntry, ToolHandler } from "./registry.js";

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

export interface ParsedArgs {
  modules: Set<string> | null;
  listModules: boolean;
  listPresets: boolean;
  /** Serve Streamable HTTP instead of stdio (--http or MCP_TRANSPORT=http). */
  http: boolean;
  port: number;
  host: string;
  discovery: boolean;
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

  return {
    modules: selectedModules,
    listModules,
    listPresets,
    http,
    port,
    host,
    discovery: discoveryEnabled(argv, env),
  };
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
      `  ${name.padEnd(14)} ${String(mod.tools.length).padStart(2)} tools  ${mod.description}\n`
    );
  }
  process.stdout.write("\nUsage: npx mcp-swiss --modules transport,weather\n\n");
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
  process.stdout.write("Combine: npx mcp-swiss --preset commuter --modules parliament\n\n");
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

function buildMcpServer() {
  return createServer({
    version: VERSION,
    modules: activeModules,
    discovery: config.discovery,
  });
}

async function main() {
  const moduleCount = activeModules.length;
  const toolCount = config.discovery
    ? 3
    : activeModules.reduce((sum, mod) => sum + mod.tools.length, 0);
  const mode = config.discovery ? ", discovery" : "";
  const summary = `${moduleCount} modules, ${toolCount} tools${mode}`;

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
