import { describe, it, expect } from "vitest";

/**
 * Unit tests for selectMatches helper in vectorSearchPage.
 */

describe("selectMatches", () => {
  it("returns only the top match when drop off exceeds threshold", async () => {
    const { selectMatches } = await import("../../src/helpers/vectorSearchPage.js");
    const strong = [
      { id: "1", score: 0.95 },
      { id: "2", score: 0.4 },
      { id: "3", score: 0.39 }
    ];
    const result = selectMatches(strong, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all strong matches when drop off is small", async () => {
    const { selectMatches } = await import("../../src/helpers/vectorSearchPage.js");
    const strong = [
      { id: "1", score: 0.8 },
      { id: "2", score: 0.7 }
    ];
    const result = selectMatches(strong, []);
    expect(result).toEqual(strong);
  });

  it("uses weak matches when no strong matches exist", async () => {
    const { selectMatches } = await import("../../src/helpers/vectorSearchPage.js");
    const weak = [
      { id: "a", score: 0.5 },
      { id: "b", score: 0.4 },
      { id: "c", score: 0.3 },
      { id: "d", score: 0.2 }
    ];
    const result = selectMatches([], weak);
    expect(result).toEqual(weak.slice(0, 3));
  });
});
