import { describe, it, expect } from "vitest";
import {
  annotationsFor,
  callTool,
  CALL_TOOL,
  correctTerm,
  DEFAULT_PINNED,
  discoveryEnabled,
  DISCOVERY_TOOLS,
  editDistance,
  listModules,
  LIST_MODULES_TOOL,
  pinnedTools,
  resolveMode,
  resolvePinned,
  searchToolFor,
  searchTools,
  SEARCH_TOOLS_TOOL,
  serverInstructions,
  suggestTools,
} from "../../src/discovery.js";
import { listing } from "../../src/server.js";
import { DISCOVERY_QUERIES } from "../fixtures/discovery-queries.js";
import { moduleRegistry, resolveModules } from "../../src/registry.js";
import { parseArgs } from "../../src/index.js";
import { validateArgs } from "../../src/utils/validate.js";

const all = resolveModules(null);

describe("mode selection", () => {
  it("is search mode by default, so nobody has to configure it", () => {
    expect(resolveMode([], {})).toBe("discovery");
    expect(discoveryEnabled([], {})).toBe(true);
    expect(parseArgs([], {}).discovery).toBe(true);
  });

  it("lists tools directly when the user picked modules or a preset", () => {
    expect(parseArgs(["--modules", "transport"], {}).discovery).toBe(false);
    expect(parseArgs(["--preset", "commuter"], {}).discovery).toBe(false);
    expect(parseArgs(["--modules", "transport", "--discovery"], {}).discovery).toBe(true);
    expect(parseArgs(["--preset", "outdoor"], { MCP_SWISS_MODE: "discovery" }).discovery).toBe(true);
  });

  it("lists everything with --mode full, --all-tools, or MCP_SWISS_MODE=full", () => {
    expect(resolveMode(["--mode", "full"], {})).toBe("full");
    expect(resolveMode(["--all-tools"], {})).toBe("full");
    expect(resolveMode([], { MCP_SWISS_MODE: "full" })).toBe("full");
    expect(resolveMode([], { MCP_SWISS_MODE: "FULL" })).toBe("full");
  });

  it("pins get_connections and get_departures unless told otherwise", () => {
    expect(resolvePinned([], {})).toEqual(DEFAULT_PINNED);
    expect(resolvePinned(["--pin", "none"], {})).toEqual([]);
    expect(resolvePinned([], { MCP_SWISS_PIN: "get_weather, geocode" })).toEqual(["get_weather", "geocode"]);
    // A pin from a module that isn't loaded is skipped, not an error.
    expect(pinnedTools(resolveModules(new Set(["weather"])), DEFAULT_PINNED)).toEqual([]);
  });

  it("turns on from the CLI flag, --mode, or MCP_SWISS_MODE", () => {
    expect(discoveryEnabled(["--discovery"])).toBe(true);
    expect(discoveryEnabled(["--mode", "discovery"])).toBe(true);
    expect(discoveryEnabled(["--mode", "Discovery"])).toBe(true);
    expect(discoveryEnabled([], { MCP_SWISS_MODE: "discovery" })).toBe(true);
    expect(parseArgs(["--discovery"]).discovery).toBe(true);
  });
});

describe("swiss_search_tools", () => {
  const top = (query: string) =>
    JSON.parse(searchTools(all, { query, limit: 3 })).tools.map((t: { name: string }) => t.name);

  it("understands plain-language queries, not just exact keywords", () => {
    expect(top("train from Aigle to Geneva")[0]).toBe("get_connections");
    expect(top("is tomorrow a public holiday")).toContain("get_public_holidays");
    expect(top("company register lookup")).toContain("search_companies");
    expect(top("CHF to EUR rate")[0]).toBe("get_exchange_rate");
    expect(top("next referendum").some((n: string) => n.includes("vote"))).toBe(true);
  });

  it("ranks a tool-name hit above a description hit", () => {
    expect(top("departures")[0]).toBe("get_departures");
  });

  it("returns nothing for stopwords alone", () => {
    expect(JSON.parse(searchTools(all, { query: "what is the" })).count).toBe(0);
  });

  it("lists modules without schemas when called with no arguments", () => {
    const result = JSON.parse(searchTools(all, {}));
    expect(result.modules.map((m: { module: string }) => m.module)).toContain("transport");
    expect(result.modules[0].tools.length).toBeGreaterThan(0);
    expect(result.tools).toBeUndefined();
  });

  it("returns schemas for a keyword match", () => {
    const result = JSON.parse(searchTools(all, { query: "departures" }));
    expect(result.count).toBeGreaterThan(0);
    const hit = result.tools.find((t: { name: string }) => t.name === "get_departures");
    expect(hit.module).toBe("transport");
    expect(hit.inputSchema).toBeTypeOf("object");
    expect(hit.description.length).toBeGreaterThan(0);
  });

  it("can limit the search to one module", () => {
    const result = JSON.parse(searchTools(all, { module: "holidays" }));
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].module).toBe("holidays");
  });

  it("rejects an unknown module", () => {
    expect(() => searchTools(all, { module: "mars" })).toThrow(/Unknown module/);
  });
});

describe("swiss_list_modules", () => {
  it("names every enabled module and its tools", () => {
    const result = JSON.parse(listModules(all));
    expect(result.modules).toHaveLength(all.length);
    const transport = result.modules.find((m: { module: string }) => m.module === "transport");
    expect(transport.tools).toContain("search_stations");
    expect(transport.description.length).toBeGreaterThan(0);
  });
});

describe("swiss_call_tool", () => {
  it("runs a local tool after checking its arguments", async () => {
    const raw = await callTool(all, { name: "list_cantons", arguments: {} });
    const cantons = JSON.parse(raw);
    expect(cantons).toHaveLength(26);
  });

  it("rejects a missing required argument before the handler runs", async () => {
    await expect(callTool(all, { name: "get_connections", arguments: {} })).rejects.toThrow(
      /from is required/
    );
  });

  it("coerces a numeric string before dispatch", () => {
    const tool = all.flatMap((mod) => mod.tools).find((t) => t.name === "get_connections");
    expect(tool).toBeDefined();
    const validated = validateArgs(tool!, { from: "Bern", to: "Zurich", limit: "2" });
    expect(validated.limit).toBe(2);
  });

  it("rejects an unknown tool and a meta-tool", async () => {
    await expect(callTool(all, { name: "not_a_tool" })).rejects.toThrow(/Unknown tool/);
    await expect(callTool(all, { name: "swiss_search_tools" })).rejects.toThrow(/cannot invoke/);
  });

  it("does not offer a tool from a module that was not enabled", async () => {
    const transportOnly = resolveModules(new Set(["transport"]));
    await expect(callTool(transportOnly, { name: "list_cantons" })).rejects.toThrow(/not enabled/);
  });
});

describe("meta-tool annotations", () => {
  it("marks search and list as read-only and call as not read-only", () => {
    expect(DISCOVERY_TOOLS.map((t) => t.name)).toEqual([
      "swiss_search_tools",
      "swiss_call_tool",
      "swiss_list_modules",
    ]);
    expect(annotationsFor(SEARCH_TOOLS_TOOL).readOnlyHint).toBe(true);
    expect(annotationsFor(LIST_MODULES_TOOL).idempotentHint).toBe(true);
    expect(annotationsFor(CALL_TOOL).readOnlyHint).toBe(true);
    expect(annotationsFor(CALL_TOOL).openWorldHint).toBe(true);
  });
});

describe("swiss_call_tool safety", () => {
  // swiss_call_tool is annotated read-only on the strength of this.
  it("only fronts read-only tools", () => {
    const names = Object.values(moduleRegistry).flatMap((m) => m.tools.map((t) => t.name));
    const writers = names.filter((n) => /^(create|update|delete|set|post|send|remove)_/.test(n));
    expect(writers).toEqual([]);
  });
});

// ── Nobody misses a tool ─────────────────────────────────────────────────────

describe("every tool is findable in search mode", () => {
  const allNames = all.flatMap((mod) => mod.tools.map((tool) => tool.name));

  it("has plain-language questions for every registered tool", () => {
    const missing = allNames.filter((name) => !DISCOVERY_QUERIES[name]?.length);
    expect(missing, "add questions to tests/fixtures/discovery-queries.ts").toEqual([]);
    const stale = Object.keys(DISCOVERY_QUERIES).filter((name) => !allNames.includes(name));
    expect(stale).toEqual([]);
  });

  // Agents see 8 results by default; demand the top 5 to leave headroom.
  const cases = Object.entries(DISCOVERY_QUERIES).flatMap(([tool, questions]) =>
    questions.map((question) => [tool, question] as const)
  );
  it.each(cases)("%s is found for %j", (tool, question) => {
    const found = JSON.parse(searchTools(all, { query: question, limit: 5 })).tools.map(
      (t: { name: string }) => t.name
    );
    expect(found).toContain(tool);
  });

  it("finds a module's whole tool list by module name", () => {
    for (const mod of all) {
      const listed = JSON.parse(searchTools(all, { module: mod.name })).modules[0].tools;
      expect(listed).toEqual(mod.tools.map((t) => t.name));
    }
  });

  it("names every module in the instructions and the search tool", () => {
    const instructions = serverInstructions(all, pinnedTools(all, DEFAULT_PINNED));
    const description = searchToolFor(all).description;
    for (const mod of all) {
      expect(instructions).toContain(`- ${mod.name}:`);
      expect(description).toContain(mod.name);
    }
  });

  it("keeps search mode at least 80% cheaper than listing everything", () => {
    const size = (discovery: boolean) => {
      const { tools, instructions } = listing(all, discovery);
      return JSON.stringify(tools).length + (instructions?.length ?? 0);
    };
    expect(size(true)).toBeLessThan(size(false) * 0.2);
  });
});

describe("typos", () => {
  it("corrects misspelt words to catalogue words", () => {
    expect(correctTerm("wether", all)).toBe("weather");
    expect(correctTerm("avalnche", all)).toBe("avalanche");
    expect(correctTerm("avalanch", all)).toBe("avalanch"); // already a prefix: matches as is
    expect(correctTerm("conections", all)).toBe("connections");
    expect(correctTerm("trian", all)).toBe("train");
  });

  it("counts a swap of neighbouring letters as one edit", () => {
    expect(editDistance("trian", "train")).toBe(1);
    expect(editDistance("abc", "xyz", 1)).toBe(2);
  });

  it("suggests the right tool for a mistyped name", async () => {
    expect(suggestTools(all, "get_conections")[0]).toBe("get_connections");
    await expect(callTool(all, { name: "get_wether" })).rejects.toThrow(/Did you mean: get_weather/);
  });
});
