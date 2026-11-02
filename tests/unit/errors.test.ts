import { describe, it, expect } from "vitest";
import { errorMessage } from "../../src/utils/errors.js";

describe("errorMessage", () => {
  it("uses an Error message", () => {
    expect(errorMessage(new Error("nope"))).toBe("nope");
  });

  it("reads message-like fields from a thrown object", () => {
    expect(errorMessage({ message: "from field" })).toBe("from field");
    expect(errorMessage({ error: "upstream" })).toBe("upstream");
  });

  it("does not stringify a plain object as [object Object]", () => {
    expect(errorMessage({ code: 12 })).toBe('{"code":12}');
    expect(errorMessage({})).toBe("Unknown error");
  });

  it("handles null and strings", () => {
    expect(errorMessage(null)).toBe("Unknown error");
    expect(errorMessage("plain")).toBe("plain");
  });
});
