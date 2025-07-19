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

  it("parses ordered lists with bullet sub-items", () => {
    const md = "1. alpha\n  - beta\n  - gamma\n2. delta";
    const html = marked.parse(md);
    expect(html).toBe("<ol><li>alpha<ul><li>beta</li><li>gamma</li></ul></li><li>delta</li></ol>");
  });

  it("handles checkbox lists", () => {
    const md = "- [ ] task one\n- [x] task two";
    const html = marked.parse(md);
    expect(html).toBe("<ul><li>task one</li><li>task two</li></ul>");
  });

  it("handles headings followed by lists", () => {
    const md = "# Title\n\n- a\n- b";
    const html = marked.parse(md);
    expect(html).toBe("<br/><h2>Title</h2><ul><li>a</li><li>b</li></ul>");
  });

  it("parses bold text", () => {
    const md = "**bold** text";
    const html = marked.parse(md);
    expect(html).toBe("<p><strong>bold</strong> text</p>");
  });

  it("parses horizontal rules", () => {
    const md = "one\n\n----\n\ntwo";
    const html = marked.parse(md);
    expect(html).toBe("<p>one</p><br/><hr/><br/><p>two</p>");
  });

  it("parses basic tables", () => {
    const md = "| a | b |\n| --- | --- |\n| c | d |";
    const html = marked.parse(md);
    expect(html).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table>"
    );
  });

  it("parses multi-row tables", () => {
    const md = "| a | b |\n| --- | --- |\n| c | d |\n| e | f |";
    const html = marked.parse(md);
    expect(html).toBe(
      "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td></tr></tbody></table>"
    );
  });
});
