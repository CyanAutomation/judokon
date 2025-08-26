import { describe, it, expect } from "vitest";
import { resolveDataDir } from "../../src/helpers/constants.js";

describe("resolveDataDir", () => {
  it("returns path within /src when module already under src", () => {
    const result = resolveDataDir("https://example.com/src/helpers/constants.js");
    expect(result).toBe("https://example.com/src/data/");
  });

  it("prefixes /src when module outside src", () => {
    const result = resolveDataDir("https://example.com/helpers/constants.js");
    expect(result).toBe("https://example.com/src/data/");
  });
});
