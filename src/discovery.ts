import { moduleRegistry, type ActiveModule, type ToolDefinition } from "./registry.js";
import { validateArgs } from "./utils/validate.js";

/**
 * Search-then-execute mode. The default server still lists every tool.
 * With --discovery, --mode discovery, or MCP_SWISS_MODE=discovery, tools/list
 * returns only these meta-tools. The agent searches, then calls by name.
 */

export const SEARCH_TOOLS_TOOL: ToolDefinition = {
  name: "swiss_search_tools",
  description:
    "Find Swiss open-data tools. Pass a keyword, a module, or both. Returns matching names, descriptions, and input schemas.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Words matched against the tool name, description, and module" },
      module: { type: "string", description: "Limit the search to one module, e.g. transport" },
      limit: { type: "number", description: "Max matches (default 8, max 25)", default: 8, maximum: 25 },
    },
  },
};

export const CALL_TOOL: ToolDefinition = {
  name: "swiss_call_tool",
  description:
    "Run one tool by name. Arguments are checked against that tool's schema before it runs.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Tool name from swiss_search_tools" },
      arguments: { type: "object", description: "Arguments for that tool" },
    },
    required: ["name"],
  },
};

export const LIST_MODULES_TOOL: ToolDefinition = {
  name: "swiss_list_modules",
  description: "List Swiss open-data modules and the tool names in each.",
  inputSchema: { type: "object", properties: {} },
};

export const DISCOVERY_TOOLS: ToolDefinition[] = [SEARCH_TOOLS_TOOL, CALL_TOOL, LIST_MODULES_TOOL];

const LOOKUP_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// swiss_call_tool runs whatever tool it is given, so it must not be
// auto-approved as a read-only lookup.
const CALL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function annotationsFor(tool: ToolDefinition) {
  if (tool.name === CALL_TOOL.name) return CALL_ANNOTATIONS;
  return LOOKUP_ANNOTATIONS;
}

export function discoveryEnabled(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (argv.includes("--discovery")) return true;
  const modeFlag = argv.indexOf("--mode");
  if (modeFlag !== -1 && argv[modeFlag + 1]?.toLowerCase() === "discovery") return true;
  return env.MCP_SWISS_MODE?.toLowerCase() === "discovery";
}

function activeMap(modules: ActiveModule[]): Map<string, ActiveModule> {
  return new Map(modules.map((mod) => [mod.name, mod]));
}

function catalog(modules: ActiveModule[]) {
  return modules.map((mod) => ({
    module: mod.name,
    description: mod.description,
    tools: mod.tools.map((tool) => tool.name),
  }));
}

export function searchTools(modules: ActiveModule[], args: Record<string, unknown>): string {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const moduleName = typeof args.module === "string" ? args.module.trim() : "";
  const requested = typeof args.limit === "number" && Number.isFinite(args.limit) ? args.limit : 8;
  const limit = Math.max(1, Math.min(25, Math.floor(requested)));

  let pool = modules;
  if (moduleName) {
    const mod = activeMap(modules).get(moduleName);
    if (!mod) {
      throw new Error(
        `Unknown module "${moduleName}". Available: ${modules.map((m) => m.name).join(", ")}`
      );
    }
    pool = [mod];
  }

  if (!query) {
    return JSON.stringify({
      modules: catalog(pool),
      hint: "Pass query to get matching tool schemas, or module to limit the catalog.",
    });
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const ranked = pool.flatMap((mod) =>
    mod.tools.map((tool) => {
      const haystack = `${mod.name} ${tool.name} ${tool.description}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return null;
      let score = 0;
      const name = tool.name.toLowerCase();
      const blob = `${mod.name} ${tool.description}`.toLowerCase();
      for (const term of terms) {
        if (name.includes(term)) score += 2;
        else if (blob.includes(term)) score += 1;
      }
      return { score, module: mod.name, tool };
    })
  ).filter((row): row is { score: number; module: string; tool: ToolDefinition } => row !== null);

  ranked.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
  const matches = ranked.slice(0, limit).map((row) => ({
    module: row.module,
    name: row.tool.name,
    description: row.tool.description,
    inputSchema: row.tool.inputSchema,
  }));

  return JSON.stringify({
    query,
    count: matches.length,
    truncated: ranked.length > matches.length,
    tools: matches,
    hint: matches.length
      ? "Call a tool with swiss_call_tool: { name, arguments }."
      : "No match. Try swiss_list_modules or a shorter query.",
  });
}

export function listModules(modules: ActiveModule[]): string {
  return JSON.stringify({ modules: catalog(modules) });
}

export async function callTool(modules: ActiveModule[], args: Record<string, unknown>): Promise<string> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) {
    throw new Error("name is required. Use swiss_search_tools to find a tool name.");
  }
  if (DISCOVERY_TOOLS.some((tool) => tool.name === name)) {
    throw new Error(`swiss_call_tool cannot invoke ${name}`);
  }
  const rawArgs = args.arguments ?? {};
  if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
    throw new Error("arguments must be an object");
  }

  for (const mod of modules) {
    const tool = mod.tools.find((candidate) => candidate.name === name);
    if (!tool) continue;
    const validated = validateArgs(tool, rawArgs as Record<string, unknown>);
    return mod.handler(name, validated);
  }

  const elsewhere = Object.entries(moduleRegistry).find(([, mod]) =>
    mod.tools.some((tool) => tool.name === name)
  );
  if (elsewhere) {
    throw new Error(`Tool ${name} belongs to module '${elsewhere[0]}', which is not enabled on this server`);
  }
  throw new Error(`Unknown tool: ${name}. Use swiss_search_tools to find one.`);
}
