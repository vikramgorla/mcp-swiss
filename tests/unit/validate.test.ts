import { describe, it, expect } from "vitest";
import { validateArgs, InvalidArgumentError, type ValidatableTool } from "../../src/utils/validate.js";
import { moduleRegistry } from "../../src/index.js";

const tool = (properties: object, required: string[] = []): ValidatableTool => ({
  name: "test_tool",
  inputSchema: { type: "object", properties, required },
});

describe("validateArgs", () => {
  it("rejects a string where a number is expected", () => {
    const schema = tool({ year: { type: "number" } });
    expect(() => validateArgs(schema, { year: '2024" OR 1=1 OR "' })).toThrow(InvalidArgumentError);
    expect(() => validateArgs(schema, { year: "abc" })).toThrow(/year must be a number/);
    expect(() => validateArgs(schema, { year: Number.NaN })).toThrow(/year must be a number/);
  });

  it("coerces a numeric string, which models often send", () => {
    expect(validateArgs(tool({ year: { type: "number" } }), { year: "2024" })).toEqual({ year: 2024 });
    expect(validateArgs(tool({ on: { type: "boolean" } }), { on: "true" })).toEqual({ on: true });
  });

  it("accepts the other JSON type where handlers always did", () => {
    expect(validateArgs(tool({ station: { type: "string" } }), { station: 2135 })).toEqual({
      station: "2135",
    });
    expect(validateArgs(tool({ postcode: { type: "string" } }), { postcode: 8001 })).toEqual({
      postcode: "8001",
    });
  });

  it("matches enums case-insensitively and returns the canonical value", () => {
    const schema = tool({ type: { type: "string", enum: ["imis", "study-plot"] } });
    expect(validateArgs(schema, { type: "IMIS" })).toEqual({ type: "imis" });
    expect(validateArgs(schema, { type: "Study-Plot" })).toEqual({ type: "study-plot" });
    expect(() => validateArgs(schema, { type: "imis2" })).toThrow(/must be one of/);

    const list = tool({ modules: { type: "array", items: { enum: ["weather", "snow"] } } });
    expect(validateArgs(list, { modules: ["SNOW"] })).toEqual({ modules: ["snow"] });
  });

  it("enforces required arguments, including empty strings", () => {
    const schema = tool({ station: { type: "string" } }, ["station"]);
    expect(() => validateArgs(schema, {})).toThrow(/station is required/);
    expect(() => validateArgs(schema, { station: "" })).toThrow(/station is required/);
    expect(validateArgs(schema, { station: "BER" })).toEqual({ station: "BER" });
  });

  it("enforces enums and maximums", () => {
    const schema = tool({ type: { type: "string", enum: ["imis", "study-plot"] } });
    expect(() => validateArgs(schema, { type: "other" })).toThrow(/must be one of/);
    expect(validateArgs(schema, { type: "imis" })).toEqual({ type: "imis" });

    const capped = tool({ limit: { type: "number", maximum: 20 } });
    expect(() => validateArgs(capped, { limit: 100 })).toThrow(/at most 20/);
  });

  it("checks array items and length", () => {
    const schema = tool({
      modules: { type: "array", items: { enum: ["weather", "snow"] }, maxItems: 2 },
    });
    expect(() => validateArgs(schema, { modules: "weather" })).toThrow(/must be an array/);
    expect(() => validateArgs(schema, { modules: ["mars"] })).toThrow(/unknown value/);
    expect(() => validateArgs(schema, { modules: ["weather", "snow", "weather"] })).toThrow(/at most 2/);
    expect(validateArgs(schema, { modules: ["snow"] })).toEqual({ modules: ["snow"] });
  });

  it("passes through unknown keys and explicit nulls", () => {
    const schema = tool({ station: { type: "string" } });
    expect(validateArgs(schema, { station: "BER", _meta: { trace: 1 }, other: null })).toEqual({
      station: "BER",
      _meta: { trace: 1 },
      other: null,
    });
  });

  it("accepts every real tool's declared defaults", () => {
    for (const mod of Object.values(moduleRegistry)) {
      for (const t of mod.tools) {
        const schema = t.inputSchema as {
          properties?: Record<string, { type?: string; enum?: unknown[]; default?: unknown; minItems?: number }>;
          required?: string[];
        };
        const properties = schema.properties ?? {};
        const base: Record<string, unknown> = {};
        for (const name of schema.required ?? []) {
          const property = properties[name] ?? {};
          if (property.enum?.length) base[name] = property.enum[0];
          else if (property.type === "number") base[name] = 1;
          else if (property.type === "boolean") base[name] = true;
          else if (property.type === "array") {
            const min = property.minItems ?? 0;
            const item = property.enum?.[0] ?? "x";
            base[name] = Array.from({ length: Math.max(min, 0) }, () => item);
          } else base[name] = "x";
        }

        for (const [name, property] of Object.entries(properties)) {
          if (property.default === undefined) continue;
          expect(
            () => validateArgs(t, { ...base, [name]: property.default }),
            `${t.name}.${name} default`
          ).not.toThrow();
        }
      }
    }
  });
});
