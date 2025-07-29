// @vitest-environment node
import { describe, it, expect } from "vitest";
import { markdownToHtml } from "../../src/helpers/markdownToHtml.js";
import { marked } from "../../src/vendor/marked.esm.js";

describe("markdownToHtml", () => {
  it("converts markdown to HTML", () => {
    const md = "**bold** text";
    expect(markdownToHtml(md)).toBe(marked.parse(md));
  });

  it("handles empty or null input", () => {
    const empty = marked.parse("");
    expect(markdownToHtml("")).toBe(empty);
    expect(markdownToHtml(null)).toBe(empty);
    expect(markdownToHtml()).toBe(empty);
  });
});
