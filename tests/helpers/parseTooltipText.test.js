// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseTooltipText } from "../../src/helpers/tooltip.js";
import { marked } from "../../src/vendor/marked.esm.js";

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

  it("renders nested markup", () => {
    const { html, warning } = parseTooltipText("**bold _italic_**");
    expect(html).toBe("<strong>bold <em>italic</em></strong>");
    expect(warning).toBe(false);
  });

  it("warns on edge-case markup", () => {
    const { html, warning } = parseTooltipText("**bold _italic**");
    expect(html).toBe("<strong>bold _italic</strong>");
    expect(warning).toBe(true);
  });

  it("falls back to marked.parse when parseInline is missing", () => {
    const orig = marked.parseInline;
    // @ts-expect-error testing fallback when parseInline is absent
    delete marked.parseInline;
    const { html, warning } = parseTooltipText("**Bold**\ntext");
    expect(html).toBe("<strong>Bold</strong><br>text");
    expect(warning).toBe(false);
    marked.parseInline = orig;
  });
});
