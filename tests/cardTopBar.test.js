import { escapeHTML } from "../helpers/cardTopBar.js";

// filepath: /workspaces/judokon/helpers/cardTopBar.test.js

describe("escapeHTML", () => {
  test("escapes special HTML characters", () => {
    expect(escapeHTML("&")).toBe("&amp;");
    expect(escapeHTML("<")).toBe("&lt;");
    expect(escapeHTML(">")).toBe("&gt;");
    expect(escapeHTML('"')).toBe("&quot;");
    expect(escapeHTML("'")).toBe("&#039;");
  });

  test("escapes a string with multiple special characters", () => {
    expect(escapeHTML('<div class="test">Hello & welcome!</div>')).toBe(
      "&lt;div class=&quot;test&quot;&gt;Hello &amp; welcome!&lt;/div&gt;"
    );
  });

  test("returns the same string if no special characters are present", () => {
    expect(escapeHTML("Hello World")).toBe("Hello World");
  });

  test("returns non-string inputs unchanged", () => {
    expect(escapeHTML(null)).toBe(null);
    expect(escapeHTML(undefined)).toBe(undefined);
    expect(escapeHTML(123)).toBe(123);
    expect(escapeHTML({})).toEqual({});
  });

  test("handles an empty string", () => {
    expect(escapeHTML("")).toBe("");
  });
});