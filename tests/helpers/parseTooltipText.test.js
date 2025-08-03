// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseTooltipText } from "../../src/helpers/tooltip.js";

describe("parseTooltipText", () => {
  it("parses bold, italic and newlines", () => {
    const { html, warning } = parseTooltipText("**Bold**\n_italic_");
    expect(html).toBe("<strong>Bold</strong><br><em>italic</em>");
    expect(warning).toBe(false);
  });

  it("escapes HTML before parsing", () => {
    const { html, warning } = parseTooltipText("<span>test</span> **ok**");
    expect(html).toBe("&lt;span&gt;test&lt;/span&gt; <strong>ok</strong>");
    expect(warning).toBe(false);
  });

  it("handles empty and null input", () => {
    expect(parseTooltipText("")).toEqual({ html: "", warning: false });
    expect(parseTooltipText(null)).toEqual({ html: "", warning: false });
  });

  it("flags unbalanced markup", () => {
    const { warning } = parseTooltipText("**Bold");
    expect(warning).toBe(true);
  });
});
