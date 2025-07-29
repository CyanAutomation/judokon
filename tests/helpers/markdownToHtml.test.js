// @vitest-environment node
import { describe, it, expect } from "vitest";
import { markdownToHtml } from "../../src/helpers/markdownToHtml.js";
import { marked } from "../../src/vendor/marked.esm.js";

describe("markdownToHtml", () => {
  it("converts headings", () => {
    const md = "# Title";
    expect(markdownToHtml(md)).toBe(marked.parse(md));
  });

  it("converts bold text", () => {
    const md = "**bold** text";
    expect(markdownToHtml(md)).toBe(marked.parse(md));
  });

  it("converts lists", () => {
    const md = "- one\n- two";
    expect(markdownToHtml(md)).toBe(marked.parse(md));
  });

  it("converts tables", () => {
    const md = "| a | b |\n| --- | --- |\n| c | d |";
    expect(markdownToHtml(md)).toBe(marked.parse(md));
  });

  it("handles empty or null input", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml(null)).toBe("");
    expect(markdownToHtml()).toBe("");
  });
});
