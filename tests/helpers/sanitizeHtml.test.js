// @vitest-environment node
import { describe, expect, it } from "vitest";
import { __TEST_ONLY__ } from "../../src/helpers/sanitizeHtml.js";

const { sanitizeBasic } = __TEST_ONLY__;

describe("sanitizeHtml fallback sanitizer", () => {
  it("escapes custom elements with inline handlers and preserves text", () => {
    const input = `<x-foo onclick=alert(1)>hi</x-foo>`;
    const result = sanitizeBasic(input);

    expect(result).toContain("&lt;x-foo");
    expect(result).toContain("hi");
    expect(result).toContain("&lt;/x-foo&gt;");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("alert(1)");
  });

  it("removes unquoted inline handlers on self-closing custom tags", () => {
    const input = `<x-foo onmouseover=alert(1)>`;
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;x-foo&gt;");
    expect(result).not.toContain("onmouseover");
    expect(result).not.toContain("alert(1)");
  });

  it("neutralizes mixed quoting styles on the same element", () => {
    const input = "<x-bar onclick='alert(1)' onfocus=alert(2) onblur=\"alert(3)\">text</x-bar>";
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;x-bar&gt;text&lt;/x-bar&gt;");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onfocus");
    expect(result).not.toContain("onblur");
  });

  it("removes hyphenated and namespaced handler attributes", () => {
    const input = `<x-bar onfoo-bar=alert(1) onsvg:load=alert(2)>`;
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;x-bar&gt;");
    expect(result).not.toContain("onfoo-bar");
    expect(result).not.toContain("onsvg:load");
  });

  it("strips multiple handlers while preserving safe content", () => {
    const input = `<strong onclick=alert(1) onkeyup=alert(2)>bold</strong>`;
    const result = sanitizeBasic(input);

    expect(result).toBe("<strong>bold</strong>");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onkeyup");
  });

  it("removes entire script blocks including nested content", () => {
    const input = `<div><script>console.log('hi')</script>safe</div>`;
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;div&gt;safe&lt;/div&gt;");
    expect(result).not.toContain("console.log");
    expect(result).not.toContain("<script");
  });

  it("removes nested and malformed script/style tag sequences", () => {
    const input =
      "<div><script><script>alert(1)</script></script>safe</div>" +
      "<script>alert(2)</script\t\n data><style>body{color:red}</style>";
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;div&gt;safe&lt;/div&gt;");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("<style");
  });

  it("handles unclosed executable tags without hanging", () => {
    const input = "<script>bad";
    const result = sanitizeBasic(input);

    expect(result).toBe("bad");
  });

  it("neutralizes truncated executable openings missing closing brackets", () => {
    const input = "<div>safe</div><script src=x";
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;div&gt;safe&lt;/div&gt;&lt;script src=x");
  });

  it("preserves content following truncated executable openings by escaping them", () => {
    const input = "<div>safe</div><script src=x trailing text";
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;div&gt;safe&lt;/div&gt;&lt;script src=x trailing text");
  });

  it("escapes truncated iframe openings missing closing brackets", () => {
    const input = '<iframe src="javascript:alert(1)"';
    const result = sanitizeBasic(input);

    expect(result).toBe('&lt;iframe src="javascript:alert(1)"');
  });

  it("escapes truncated closing tags for non-allowlisted elements", () => {
    const input = "</iframe";
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;/iframe");
  });

  it("treats truncated allowlisted tags as text", () => {
    const input = "<strong";
    const result = sanitizeBasic(input);

    expect(result).toBe("&lt;strong");
  });

  it("removes executable tags with unusual spacing and casing", () => {
    const input =
      '<ScRiPt\n type="text/javascript" data-test=1>evil</sCrIpT>' +
      "<STYLE media=all>body{color:red}</STyle >";
    const result = sanitizeBasic(input);

    expect(result).toBe("");
  });

  it("strips executable tags from large inputs within bounds", () => {
    const payload = "a".repeat(1024);
    const input = `<div>${payload}</div><script>${payload}</script>`;
    const result = sanitizeBasic(input);

    expect(result).toBe(`&lt;div&gt;${payload}&lt;/div&gt;`);
  });

  it("handles very large payloads without exceeding iteration caps", () => {
    const payload = "x".repeat(10 * 1024);
    const input = `<script>${payload}</script>${payload}`;
    const result = sanitizeBasic(input);

    expect(result).toBe(payload);
  });

});
