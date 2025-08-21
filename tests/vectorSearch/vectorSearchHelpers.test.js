import { describe, it, expect } from "vitest";
import { selectMatches } from "../../src/helpers/api/vectorSearchPage.js";
import { formatSourcePath, formatTags } from "../../src/helpers/vectorSearchPage/renderUtils.js";

/**
 * Unit tests for vector search helper utilities.
 */

describe("selectMatches", () => {
  it("returns only the top match when drop off exceeds threshold", () => {
    const strong = [
      { id: "1", score: 0.95 },
      { id: "2", score: 0.4 },
      { id: "3", score: 0.39 }
    ];
    const result = selectMatches(strong, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all strong matches when drop off is small", () => {
    const strong = [
      { id: "1", score: 0.8 },
      { id: "2", score: 0.7 }
    ];
    const result = selectMatches(strong, []);
    expect(result).toEqual(strong);
  });

  it("uses weak matches when no strong matches exist", () => {
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

describe("formatSourcePath", () => {
  it("splits path segments with line breaks", () => {
    const frag = formatSourcePath("design/foo/bar.md");
    const container = document.createElement("div");
    container.appendChild(frag);
    expect(container.innerHTML).toBe(
      "<span>design</span><br><span>foo</span><br><span>bar.md</span>"
    );
  });
});

describe("formatTags", () => {
  it("joins tag names with commas", () => {
    expect(formatTags(["alpha", "beta"])).toBe("alpha, beta");
  });

  it("returns empty string for non-arrays", () => {
    expect(formatTags(null)).toBe("");
  });
});
