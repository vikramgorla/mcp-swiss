import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  moduleRegistry,
  presets,
  parseArgs,
  resolveModules,
} from "../../src/index.js";

// ── Module Registry ──────────────────────────────────────────────────────────

describe("Module Registry", () => {
  it("should have all 20 modules", () => {
    expect(Object.keys(moduleRegistry)).toHaveLength(20);
  });

  it("should contain every expected module name", () => {
    const expected = [
      "transport",
      "weather",
      "geodata",
      "companies",
      "holidays",
      "parliament",
      "avalanche",
      "airquality",
      "post",
      "energy",
      "statistics",
      "snb",
      "recycling",
      "news",
      "voting",
      "dams",
      "hiking",
      "realestate",
      "traffic",
      "earthquakes",
    ];
    for (const name of expected) {
      expect(moduleRegistry).toHaveProperty(name);
    }
  });

  it("each module should have tools array and handler function", () => {
    for (const [name, entry] of Object.entries(moduleRegistry)) {
      expect(Array.isArray(entry.tools), `${name}.tools is array`).toBe(true);
      expect(entry.tools.length, `${name} has at least 1 tool`).toBeGreaterThan(
        0
      );
      expect(typeof entry.handler, `${name}.handler is function`).toBe(
        "function"
      );
    }
  });

  it("total tool count should be 68", () => {
    const total = Object.values(moduleRegistry).reduce(
      (sum, m) => sum + m.tools.length,
      0
    );
    expect(total).toBe(68);
  });
});

// ── Presets ───────────────────────────────────────────────────────────────────

describe("Presets", () => {
  it("should have 6 presets", () => {
    expect(Object.keys(presets)).toHaveLength(6);
  });

  it("commuter should have transport, weather, holidays", () => {
    expect(presets.commuter).toEqual(["transport", "weather", "holidays"]);
  });

  it("outdoor should have weather, avalanche, hiking, earthquakes, dams", () => {
    expect(presets.outdoor).toEqual([
      "weather",
      "avalanche",
      "hiking",
      "earthquakes",
      "dams",
    ]);
  });

  it("business should have companies, geodata, post, energy, statistics, snb", () => {
    expect(presets.business).toEqual([
      "companies",
      "geodata",
      "post",
      "energy",
      "statistics",
      "snb",
    ]);
  });

  it("citizen should have parliament, voting, holidays, news", () => {
    expect(presets.citizen).toEqual([
      "parliament",
      "voting",
      "holidays",
      "news",
    ]);
  });

  it("minimal should have transport only", () => {
    expect(presets.minimal).toEqual(["transport"]);
  });

  it("full should have all 20 modules", () => {
    expect(presets.full).toHaveLength(20);
    expect(new Set(presets.full)).toEqual(
      new Set(Object.keys(moduleRegistry))
    );
  });

  it("all preset modules should exist in registry", () => {
    for (const [presetName, modules] of Object.entries(presets)) {
      for (const mod of modules) {
        expect(
          moduleRegistry[mod],
          `preset '${presetName}' references unknown module '${mod}'`
        ).toBeDefined();
      }
    }
  });
});

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

describe("CLI Arguments — parseArgs()", () => {
  // We mock process.exit and process.stderr.write for error cases
  let exitMock: ReturnType<typeof vi.spyOn>;
  let stderrMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitMock = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as unknown as (code?: number) => never);
    stderrMock = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    exitMock.mockRestore();
    stderrMock.mockRestore();
  });

  it("should default to all modules when no flags", () => {
    const result = parseArgs([]);
    expect(result.modules).toBeNull();
    expect(result.listModules).toBe(false);
    expect(result.listPresets).toBe(false);
  });

  it("should parse --modules flag", () => {
    const result = parseArgs(["--modules", "transport,weather"]);
    expect(result.modules).toEqual(new Set(["transport", "weather"]));
  });

  it("should parse --preset flag", () => {
    const result = parseArgs(["--preset", "commuter"]);
    expect(result.modules).toEqual(
      new Set(["transport", "weather", "holidays"])
    );
  });

  it("should combine preset and modules", () => {
    const result = parseArgs([
      "--preset",
      "commuter",
      "--modules",
      "parliament",
    ]);
    expect(result.modules).toEqual(
      new Set(["transport", "weather", "holidays", "parliament"])
    );
  });

  it("should parse --list-modules flag", () => {
    const result = parseArgs(["--list-modules"]);
    expect(result.listModules).toBe(true);
  });

  it("should parse --list-presets flag", () => {
    const result = parseArgs(["--list-presets"]);
    expect(result.listPresets).toBe(true);
  });

  it("should reject unknown modules", () => {
    parseArgs(["--modules", "transport,nonexistent"]);
    expect(exitMock).toHaveBeenCalledWith(1);
    expect(stderrMock).toHaveBeenCalledWith(
      expect.stringContaining("Unknown modules: nonexistent")
    );
  });

  it("should reject unknown presets", () => {
    parseArgs(["--preset", "doesnotexist"]);
    expect(exitMock).toHaveBeenCalledWith(1);
    expect(stderrMock).toHaveBeenCalledWith(
      expect.stringContaining("Unknown preset: doesnotexist")
    );
  });

  it("should handle --modules with spaces in comma list", () => {
    const result = parseArgs(["--modules", "transport, weather , geodata"]);
    expect(result.modules).toEqual(
      new Set(["transport", "weather", "geodata"])
    );
  });
});

// ── resolveModules ───────────────────────────────────────────────────────────

describe("resolveModules()", () => {
  it("should return all modules when null is passed", () => {
    const active = resolveModules(null);
    expect(active).toHaveLength(20);
    expect(active.map((m) => m.name)).toEqual(Object.keys(moduleRegistry));
  });

  it("should return only selected modules", () => {
    const active = resolveModules(new Set(["transport", "weather"]));
    expect(active).toHaveLength(2);
    expect(active.map((m) => m.name)).toEqual(["transport", "weather"]);
  });

  it("should skip unknown names gracefully", () => {
    const active = resolveModules(new Set(["transport", "nope"]));
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("transport");
  });

  it("each resolved module should have tools and handler", () => {
    const active = resolveModules(new Set(["geodata"]));
    expect(active[0].tools.length).toBeGreaterThan(0);
    expect(typeof active[0].handler).toBe("function");
  });
});
