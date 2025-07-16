// @vitest-environment node
import { describe, it, expect } from "vitest";
import { marked } from "../../src/vendor/marked.esm.js";

describe("marked.parse", () => {
  it("parses unordered lists", () => {
    const md = "- one\n- two";
    const html = marked.parse(md);
    expect(html).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("parses ordered lists", () => {
    const md = "1. first\n2. second";
    const html = marked.parse(md);
    expect(html).toBe("<ol><li>first</li><li>second</li></ol>");
  });

  it("handles headings followed by lists", () => {
    const md = "# Title\n\n- a\n- b";
    const html = marked.parse(md);
    expect(html).toBe("<h1>Title</h1><ul><li>a</li><li>b</li></ul>");
  });
});
