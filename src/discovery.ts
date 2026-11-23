import { moduleRegistry, type ToolDefinition, type ToolHandler } from "./registry.js";

export interface DiscoveryModule {
  name: string;
  description?: string;
  tools: ToolDefinition[];
  handler: ToolHandler;
}
import { validateArgs } from "./utils/validate.js";

/**
 * Search-then-execute mode, the default since 0.10.0.
 *
 * tools/list returns three meta-tools plus a few pinned everyday tools, and the
 * initialize result carries short instructions with the module catalog. The
 * agent searches, then calls by name. This keeps every conversation about
 * 1,000 tokens lighter than listing all 94 schemas, without hiding any tool.
 *
 * Full listing: --mode full, --all-tools, or MCP_SWISS_MODE=full. Choosing
 * modules with --modules or --preset also lists those tools directly, because
 * whoever picked them already knows what they want.
 */

export const SEARCH_TOOLS_TOOL: ToolDefinition = {
  name: "swiss_search_tools",
  description:
    "Find the right Swiss public-data tool (trains, weather, companies, holidays, maps, statistics and more). Describe the task in plain words; returns the best-matching tools with their input schemas. Call them with swiss_call_tool.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "What you want to do, in plain words" },
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

export type ServerMode = "discovery" | "full";

/** Everyday tools listed directly next to the meta-tools (Anthropic suggests 3-5). */
export const DEFAULT_PINNED = ["get_connections", "get_departures"];

function flag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

export function resolveMode(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
  modulesSelected = false
): ServerMode {
  if (argv.includes("--discovery")) return "discovery";
  if (argv.includes("--all-tools") || argv.includes("--full")) return "full";
  const explicit = (flag(argv, "--mode") ?? env.MCP_SWISS_MODE ?? "").trim().toLowerCase();
  if (explicit === "discovery" || explicit === "search") return "discovery";
  if (explicit === "full" || explicit === "all") return "full";
  return modulesSelected ? "full" : "discovery";
}

export function discoveryEnabled(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
  modulesSelected = false
): boolean {
  return resolveMode(argv, env, modulesSelected) === "discovery";
}

/** --pin a,b / MCP_SWISS_PIN=a,b; "none" lists only the meta-tools. */
export function resolvePinned(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const raw = flag(argv, "--pin") ?? env.MCP_SWISS_PIN;
  if (raw === undefined) return DEFAULT_PINNED;
  if (raw.trim().toLowerCase() === "none" || raw.trim() === "") return [];
  return raw.split(",").map((n) => n.trim()).filter(Boolean);
}

/** The pinned tools that exist in the active modules, in pin order. */
export function pinnedTools(modules: DiscoveryModule[], pinned: string[]): ToolDefinition[] {
  const byName = new Map(modules.flatMap((m) => m.tools.map((t) => [t.name, t] as const)));
  return pinned.map((n) => byName.get(n)).filter((t): t is ToolDefinition => Boolean(t));
}

/** swiss_search_tools with the active module names in its description. */
export function searchToolFor(modules: DiscoveryModule[]): ToolDefinition {
  return {
    ...SEARCH_TOOLS_TOOL,
    description: `${SEARCH_TOOLS_TOOL.description} Modules: ${modules.map((m) => m.name).join(", ")}.`,
  };
}

/** Sent in the initialize result; clients add it to the model's context. */
export function serverInstructions(modules: DiscoveryModule[], pinned: ToolDefinition[]): string {
  const toolCount = modules.reduce((n, m) => n + m.tools.length, 0);
  const lines = modules.map((m) => `- ${m.name}: ${m.description ?? ""}`.trimEnd());
  const direct = pinned.length
    ? ` ${pinned.map((t) => t.name).join(" and ")} can also be called directly.`
    : "";
  return [
    `mcp-swiss: ${toolCount} read-only tools for Swiss public data, no API keys.`,
    `Only a few are listed. To use any other, call swiss_search_tools with plain words ` +
      `(e.g. "avalanche danger Verbier", "CHF to EUR"), then swiss_call_tool with the returned name ` +
      `and arguments.${direct} Search before saying something isn't available.`,
    "Modules:",
    ...lines,
  ].join("\n");
}

/** Close names for a mistyped tool, so the agent can recover in one step. */
export function suggestTools(modules: DiscoveryModule[], name: string, limit = 3): string[] {
  const wanted = name.trim().toLowerCase();
  const terms = queryTerms(wanted.replace(/_/g, " ")).map((term) => correctTerm(term, modules));
  return modules
    .flatMap((mod) =>
      mod.tools.map((tool) => {
        // A near-miss of the whole name ranks first, then word matches.
        const distance = editDistance(wanted, tool.name, 3);
        const typo = distance <= 3 ? 10 - distance : 0;
        return { name: tool.name, score: typo + scoreTool(terms, mod, tool) };
      })
    )
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row) => row.name);
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

  const corrected = queryTerms(query).map((term) => correctTerm(term, modules));
  const terms = queryTerms(corrected.join(" "));
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
  ("a an and any are at be by can do does for from get give how i in is it me my " +
    "next now of on or show tell the there this to tomorrow what when which " +
    "who will with").split(" ")
);

// Words that appear in many tool names ("find_", "list_", "_details") or
// everywhere ("swiss"). They still count, but too little to outrank a topic word.
const WEAK = new Set(
  "find search look lookup up list all details detail info information data swiss switzerland".split(" ")
);

// Everyday words that never appear in the tool text itself, grouped by what
// they point at. Each word expands to the catalogue terms on the right.
const CONCEPTS: Array<[string, string[]]> = [
  // getting around
  ["train trains rail railway bus buses tram trams postbus boat ferry way route routes travel " +
    "journey trip trips commute fastest timetable reach", ["connections", "transport"]],
  ["stop stops bahnhof gare stazione platform", ["station"]],
  ["delay delays late punctual yesterday", ["punctuality"]],
  ["wheelchair stepfree barrier", ["accessibility"]],
  // weather, water, nature
  ["forecast rain raining rainy sunny sun wind windy cold hot warm humidity temperature " +
    "temperatures degrees", ["weather"]],
  ["river rivers lake lakes aare rhine rhein rhone reuss limmat flood floods", ["water", "river", "hydro"]],
  ["ski skiing piste freeride offpiste", ["snow", "avalanche"]],
  ["quake quakes tremor seismic", ["earthquakes"]],
  ["allergy allergies sneezing", ["pollen"]],
  ["smog pollution ozone particulate", ["air", "quality"]],
  ["hike hikes hiking trail trails path paths walk", ["trail", "hiking"]],
  ["reservoir reservoirs", ["dams"]],
  // places and maps
  ["gps position latitude longitude latlon coordinates", ["coordinates", "geocode"]],
  ["where mountain mountains peak summit castle landmark village", ["places", "geocode"]],
  ["commune communes gemeinde town towns city", ["municipality"]],
  ["house houses home flat apartment property", ["building", "real"]],
  ["zip postal plz", ["postcode"]],
  ["parcel package letter shipment", ["track", "parcel"]],
  // people, money, institutions
  ["firm firms business businesses startup employer uid", ["company"]],
  ["register registry handelsregister", ["zefix", "company"]],
  ["mp mps politician politicians councillor councillors representative representatives " +
    "deputy deputies nationalrat standerat", ["parliament", "members"]],
  ["bill bills law laws motion", ["parliament", "business"]],
  ["vote votes referendum referendums initiative ballot abstimmung", ["vote", "popular"]],
  ["election elections", ["voting", "parliament"]],
  ["money currency currencies chf franc francs dollar dollars euro euros usd eur gbp pound jpy yen " +
    "convert conversion", ["exchange", "snb"]],
  ["power kwh energy", ["electricity"]],
  ["people inhabitants residents", ["population"]],
  ["inflation prices", ["price", "index"]],
  ["garbage trash rubbish recycling cardboard paper glass", ["waste"]],
  ["headline headlines srf", ["news"]],
  ["vacation vacations bank easter christmas ascension pentecost whit whitsun", ["holidays", "public"]],
  ["kids children pupils break autumn", ["school", "holidays"]],
  ["street streets", ["address"]],
  ["cars vehicles motorway highway autobahn", ["traffic"]],
  ["roof rooftop panels photovoltaic", ["solar"]],
  ["past history historic", ["history"]],
  ["days daily", ["daily"]],
  ["nearby closest around", ["near"]],
];

const SYNONYMS: Record<string, string[]> = {};
for (const [words, targets] of CONCEPTS) {
  for (const word of words.split(/\s+/)) SYNONYMS[word] = [...(SYNONYMS[word] ?? []), ...targets];
}

/** "raining" -> "rain", "rainy" -> "rain", "parcels" -> "parcel". */
function baseForm(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("y")) return word.slice(0, -1);
  if (word.length > 4 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function queryTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const expanded = new Set(words);
  for (const w of words) {
    for (const alt of SYNONYMS[w] ?? SYNONYMS[baseForm(w)] ?? []) expanded.add(alt);
  }
  return [...expanded];
}

/** Damerau edit distance (a swap of neighbours counts once), capped at max + 1. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let older: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], older[j - 2] + 1);
      }
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    older = prev;
    prev = cur;
  }
  return prev[b.length];
}

// Every word the catalogue uses, with how significant it is (names > text).
const vocabularies = new WeakMap<DiscoveryModule[], Map<string, number>>();

function vocabulary(modules: DiscoveryModule[]): Map<string, number> {
  const cached = vocabularies.get(modules);
  if (cached) return cached;
  const vocab = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (word.length >= 4) vocab.set(word, Math.max(vocab.get(word) ?? 0, weight));
    }
  };
  for (const mod of modules) {
    add(mod.name, 3);
    add(mod.description ?? "", 1);
    for (const tool of mod.tools) {
      add(tool.name.replace(/_/g, " "), 4);
      add(tool.description, 2);
    }
  }
  for (const [word, alts] of Object.entries(SYNONYMS)) {
    vocab.set(word, Math.max(vocab.get(word) ?? 0, 2));
    for (const alt of alts) vocab.set(alt, Math.max(vocab.get(alt) ?? 0, 2));
  }
  vocabularies.set(modules, vocab);
  return vocab;
}

/** Replace a misspelt word ("wether", "conections") with the closest catalogue word. */
export function correctTerm(term: string, modules: DiscoveryModule[]): string {
  if (term.length < 4) return term;
  const vocab = vocabulary(modules);
  if (vocab.has(term) || [...vocab.keys()].some((w) => w.includes(term))) return term;
  const maxEdits = term.length >= 8 ? 2 : 1;
  let best: { word: string; distance: number; weight: number } | undefined;
  for (const [word, weight] of vocab) {
    const distance = editDistance(term, word, maxEdits);
    if (distance > maxEdits) continue;
    if (!best || distance < best.distance || (distance === best.distance && weight > best.weight)) {
      best = { word, distance, weight };
    }
  }
  return best?.word ?? term;
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
    score += WEAK.has(term) ? Math.min(best, 0.25) : best;
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
  const close = suggestTools(modules, name);
  const hint = close.length ? ` Did you mean: ${close.join(", ")}?` : "";
  throw new Error(`Unknown tool: ${name}.${hint} Use swiss_search_tools to find one.`);
}
