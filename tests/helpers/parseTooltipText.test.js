// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseTooltipText } from "../../src/helpers/tooltip.js";

describe("parseTooltipText", () => {
  it("parses bold, italic and newlines", () => {
    const result = parseTooltipText("**Bold**\n_italic_");
    expect(result).toBe("<strong>Bold</strong><br><em>italic</em>");
  });

  it("escapes HTML before parsing", () => {
    const result = parseTooltipText("<span>test</span> **ok**");
    expect(result).toBe("&lt;span&gt;test&lt;/span&gt; <strong>ok</strong>");
  });

  it("handles empty and null input", () => {
    expect(parseTooltipText("")).toBe("");
    expect(parseTooltipText(null)).toBe("");
  });
});
