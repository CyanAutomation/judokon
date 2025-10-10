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
});
