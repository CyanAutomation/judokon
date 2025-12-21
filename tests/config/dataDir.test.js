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

  it.each([
    {
      description: "https modules already under /src",
      moduleUrl: "https://example.com/src/helpers/constants.js",
      expected: "https://example.com/src/data/"
    },
    {
      description: "https modules outside /src",
      moduleUrl: "https://example.com/helpers/constants.js",
      expected: "https://example.com/src/data/"
    },
    {
      description: "file scheme URLs within /src",
      moduleUrl: "file:///app/src/helpers/constants.js",
      expected: "file:///app/src/data/"
    },
    {
      description: "file scheme URLs outside /src",
      moduleUrl: "file:///app/helpers/constants.js",
      expected: "file:///app/data/"
    }
  ])("accepts URL instances for %s", ({ moduleUrl, expected }) => {
    expect(resolveDataDir(new URL(moduleUrl))).toBe(expected);
  });
});
