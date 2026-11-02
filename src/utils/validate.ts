/**
 * Minimal validation of tool arguments against a tool's inputSchema.
 *
 * MCP does not coerce or check arguments, so without this a handler receives
 * whatever the model produced: a `year` sent as "2024" would be spliced into an
 * upstream query as a string, and a `radius` of "far" would become NaN in a URL.
 * Only the schema features these tools actually use are supported.
 */

export interface ValidatableTool {
  name: string;
  inputSchema: object;
}

interface PropertySchema {
  type?: "string" | "number" | "boolean" | "array";
  enum?: unknown[];
  items?: { type?: string; enum?: unknown[] };
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

interface ToolSchema {
  properties?: Record<string, PropertySchema>;
  required?: string[];
}

export class InvalidArgumentError extends Error {}

function describe(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return "an array";
  if (value === null) return "null";
  return String(value);
}

/**
 * Models move values between JSON types freely, and these handlers accepted
 * both forms before validation existed: a station id sent as 2135 rather than
 * "2135" has to keep working. Coerce only where the meaning is unambiguous.
 */
function coerce(value: unknown, type: PropertySchema["type"]): unknown {
  if (type === "number" && typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (type === "string" && (typeof value === "number" || typeof value === "boolean")) {
    return String(value);
  }
  if (type === "boolean" && typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}

/**
 * Enums carry canonical spellings, but handlers used to lower-case their input.
 * Match case-insensitively and hand the handler the canonical value.
 */
function matchEnum(value: unknown, allowed: unknown[]): unknown | undefined {
  if (allowed.includes(value)) return value;
  if (typeof value !== "string") return undefined;
  const folded = value.toLowerCase();
  return allowed.find((option) => typeof option === "string" && option.toLowerCase() === folded);
}

function checkType(name: string, value: unknown, schema: PropertySchema): unknown {
  const coerced = coerce(value, schema.type);

  switch (schema.type) {
    case "number":
      if (typeof coerced !== "number" || !Number.isFinite(coerced)) {
        throw new InvalidArgumentError(`${name} must be a number, got ${describe(value)}`);
      }
      if (schema.maximum !== undefined && coerced > schema.maximum) {
        throw new InvalidArgumentError(`${name} must be at most ${schema.maximum}, got ${coerced}`);
      }
      break;
    case "string":
      if (typeof coerced !== "string") {
        throw new InvalidArgumentError(`${name} must be a string, got ${describe(value)}`);
      }
      break;
    case "boolean":
      if (typeof coerced !== "boolean") {
        throw new InvalidArgumentError(`${name} must be true or false, got ${describe(value)}`);
      }
      break;
    case "array": {
      if (!Array.isArray(coerced)) {
        throw new InvalidArgumentError(`${name} must be an array, got ${describe(value)}`);
      }
      if (schema.minItems !== undefined && coerced.length < schema.minItems) {
        throw new InvalidArgumentError(`${name} needs at least ${schema.minItems} item(s)`);
      }
      if (schema.maxItems !== undefined && coerced.length > schema.maxItems) {
        throw new InvalidArgumentError(`${name} takes at most ${schema.maxItems} item(s)`);
      }
      if (schema.items?.enum) {
        const allowed = schema.items.enum;
        return coerced.map((item) => {
          const match = matchEnum(item, allowed);
          if (match === undefined) {
            throw new InvalidArgumentError(
              `${name} has an unknown value ${describe(item)}; allowed: ${allowed.join(", ")}`
            );
          }
          return match;
        });
      }
      break;
    }
    default:
      break;
  }

  if (schema.enum) {
    const match = matchEnum(coerced, schema.enum);
    if (match === undefined) {
      throw new InvalidArgumentError(
        `${name} must be one of: ${schema.enum.join(", ")}; got ${describe(value)}`
      );
    }
    return match;
  }

  return coerced;
}

/**
 * Returns the arguments with any safe coercions applied. Throws
 * InvalidArgumentError when a value cannot be used as the schema describes.
 */
export function validateArgs(
  tool: ValidatableTool,
  args: Record<string, unknown>
): Record<string, unknown> {
  const schema = tool.inputSchema as ToolSchema;
  const properties = schema.properties ?? {};

  for (const name of schema.required ?? []) {
    const value = args[name];
    if (value === undefined || value === null || value === "") {
      throw new InvalidArgumentError(`${name} is required`);
    }
  }

  const result: Record<string, unknown> = { ...args };
  for (const [name, value] of Object.entries(args)) {
    const property = properties[name];
    // Unknown keys are left alone: handlers ignore them, and rejecting them
    // would break on clients that add their own metadata.
    if (!property || value === undefined || value === null) continue;
    result[name] = checkType(name, value, property);
  }

  return result;
}
