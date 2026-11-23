import { moduleRegistry, type ToolDefinition, type ToolHandler } from "./registry.js";

export interface DiscoveryModule {
  name: string;
  description?: string;
  tools: ToolDefinition[];
  handler: ToolHandler;
}
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

// Every tool in the registry is a read-only lookup (a unit test enforces
// this), so swiss_call_tool is read-only too, like Atlassian's executeRead.
// If a tool with side effects is ever added, split this into separate
// read/write execute tools instead of loosening the hint.
const CALL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
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

function activeMap(modules: DiscoveryModule[]): Map<string, DiscoveryModule> {
  return new Map(modules.map((mod) => [mod.name, mod]));
}

function catalog(modules: DiscoveryModule[]) {
  return modules.map((mod) => ({
    module: mod.name,
    description: mod.description,
    tools: mod.tools.map((tool) => tool.name),
  }));
}

export function searchTools(modules: DiscoveryModule[], args: Record<string, unknown>): string {
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

  const terms = queryTerms(query);
  const ranked = pool.flatMap((mod) =>
    mod.tools.map((tool) => {
      const score = scoreTool(terms, mod, tool);
      return score > 0 ? { score, module: mod.name, tool } : null;
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

// ── Ranking ──────────────────────────────────────────────────────────────────
// Agents send plain language ("train from Aigle to Geneva"), so a tool matches
// when any meaningful word does, ranked by where and how many words hit.

const STOPWORDS = new Set(
  ("a an and any are at be by can do does for from get give how i in is it me my near " +
    "next now of on or show tell the there this to today tomorrow what when where which " +
    "who will with yesterday").split(" ")
);

// A few everyday words that never appear in the tool text itself.
const SYNONYMS: Record<string, string[]> = {
  train: ["sbb", "connections", "transport"],
  trains: ["sbb", "connections", "transport"],
  bus: ["transport", "departures"],
  tram: ["transport", "departures"],
  journey: ["connections"],
  trip: ["connections"],
  forecast: ["weather", "meteoswiss"],
  rain: ["weather", "precipitation"],
  temperature: ["weather"],
  firm: ["company"],
  business: ["company"],
  register: ["zefix", "company"],
  vote: ["voting"],
  referendum: ["vote", "popular"],
  initiative: ["vote", "popular"],
  election: ["voting", "parliament"],
  money: ["exchange", "snb"],
  currency: ["exchange", "snb"],
  chf: ["exchange", "snb"],
  zip: ["postcode"],
  postal: ["postcode"],
  ski: ["snow", "avalanche"],
  quake: ["earthquakes"],
  house: ["building", "real"],
};

export function queryTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const expanded = new Set(words);
  for (const w of words) for (const alt of SYNONYMS[w] ?? []) expanded.add(alt);
  return [...expanded];
}

function stem(word: string): string {
  return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}

function paramText(tool: ToolDefinition): string {
  const props = (tool.inputSchema as { properties?: Record<string, { description?: string }> }).properties ?? {};
  return Object.entries(props)
    .map(([key, value]) => `${key} ${value?.description ?? ""}`)
    .join(" ");
}

export function scoreTool(terms: string[], mod: DiscoveryModule, tool: ToolDefinition): number {
  const fields: Array<[string, number]> = [
    [tool.name.toLowerCase().replace(/_/g, " "), 4],
    [mod.name.toLowerCase(), 3],
    [tool.description.toLowerCase(), 2],
    [(mod.description ?? "").toLowerCase(), 1],
    [paramText(tool).toLowerCase(), 0.5],
  ];
  let score = 0;
  for (const term of terms) {
    const root = stem(term);
    let best = 0;
    for (const [text, weight] of fields) {
      if (weight > best && text.includes(root)) best = weight;
    }
    score += best;
  }
  return score;
}

export function listModules(modules: DiscoveryModule[]): string {
  return JSON.stringify({ modules: catalog(modules) });
}

export async function callTool(modules: DiscoveryModule[], args: Record<string, unknown>): Promise<string> {
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
