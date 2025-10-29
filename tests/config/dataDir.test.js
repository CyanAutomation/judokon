import { describe, it, expect } from "vitest";
import { resolveDataDir } from "../../src/helpers/constants.js";

describe("resolveDataDir", () => {
  it("returns path within /src when module already under src", () => {
    const result = resolveDataDir("https://example.com/src/helpers/constants.js");
    expect(result).toBe("https://example.com/src/data/");
  });

  it("resolves file scheme URLs already within /src", () => {
    const result = resolveDataDir("file:///app/src/helpers/constants.js");
    expect(result).toBe("file:///app/src/data/");
  });

  it("prefixes /src when module outside src", () => {
    const result = resolveDataDir("https://example.com/helpers/constants.js");
    expect(result).toBe("https://example.com/src/data/");
  });

  it("falls back to resolving relative paths for non-http schemes", () => {
    const result = resolveDataDir("file:///app/helpers/constants.js");
    expect(result).toBe("file:///app/data/");
  });

  it("accepts URL instances in addition to string inputs", () => {
    const moduleUrl = "https://example.com/src/helpers/constants.js";
    expect(resolveDataDir(new URL(moduleUrl))).toBe("https://example.com/src/data/");
  });

  it("accepts URL instances for modules outside /src", () => {
    const moduleUrl = "https://example.com/helpers/constants.js";
    expect(resolveDataDir(new URL(moduleUrl))).toBe("https://example.com/src/data/");
  });

  it("accepts URL instances for file scheme URLs within /src", () => {
    const moduleUrl = "file:///app/src/helpers/constants.js";
    expect(resolveDataDir(new URL(moduleUrl))).toBe("file:///app/src/data/");
  });

  it("accepts URL instances for file scheme URLs outside /src", () => {
    const moduleUrl = "file:///app/helpers/constants.js";
    expect(resolveDataDir(new URL(moduleUrl))).toBe("file:///app/data/");
  });
});
