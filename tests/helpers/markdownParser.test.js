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

  it("parses nested lists", () => {
    const md = "- a\n  - b";
    const html = marked.parse(md);
    expect(html).toBe("<ul><li>a<ul><li>b</li></ul></li></ul>");
  });

  it("handles checkbox lists", () => {
    const md = "- [ ] task one\n- [x] task two";
    const html = marked.parse(md);
    expect(html).toBe("<ul><li>task one</li><li>task two</li></ul>");
  });

  it("handles headings followed by lists", () => {
    const md = "# Title\n\n- a\n- b";
    const html = marked.parse(md);
    expect(html).toBe("<h1>Title</h1><ul><li>a</li><li>b</li></ul>");
  });

  it("parses bold text", () => {
    const md = "**bold** text";
    const html = marked.parse(md);
    expect(html).toBe("<p><strong>bold</strong> text</p>");
  });

  it("parses horizontal rules", () => {
    const md = "one\n\n----\n\ntwo";
    const html = marked.parse(md);
    expect(html).toBe("<p>one</p><hr/><p>two</p>");
  });
});
