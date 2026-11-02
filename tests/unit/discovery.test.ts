import { describe, it, expect } from "vitest";
import {
  annotationsFor,
  callTool,
  CALL_TOOL,
  discoveryEnabled,
  DISCOVERY_TOOLS,
  listModules,
  LIST_MODULES_TOOL,
  searchTools,
  SEARCH_TOOLS_TOOL,
} from "../../src/discovery.js";
import { resolveModules } from "../../src/registry.js";
import { parseArgs } from "../../src/index.js";
import { validateArgs } from "../../src/utils/validate.js";

const all = resolveModules(null);

describe("discovery mode switch", () => {
  it("stays off by default", () => {
    expect(discoveryEnabled([])).toBe(false);
    expect(parseArgs([]).discovery).toBe(false);
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
    expect(annotationsFor(CALL_TOOL).readOnlyHint).toBe(false);
    expect(annotationsFor(CALL_TOOL).openWorldHint).toBe(true);
  });
});
