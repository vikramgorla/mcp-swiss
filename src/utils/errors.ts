/**
 * Anything can be thrown in JS, and `String(value)` on a plain object yields
 * "[object Object]", which tells the agent nothing. Dig out something readable.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || "Error";
  if (typeof error === "string") return error || "Unknown error";
  if (error == null) return "Unknown error";
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "reason"]) {
      const value = record[key];
      if (typeof value === "string" && value) return value;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch {
      // circular or non-serialisable — fall through
    }
    return "Unknown error";
  }
  return String(error);
}
