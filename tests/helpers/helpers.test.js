// @vitest-environment node
import { describe, test, expect } from "vitest";
import { formatDate, escapeHTML } from "../../src/helpers/utils.js";

describe("formatDate", () => {
  test.each(["not-a-date", "2025-02-30"])('returns "Invalid Date" for input %p', (input) => {
    expect(() => formatDate(input)).not.toThrow();
    expect(formatDate(input)).toBe("Invalid Date");
  });

  test("formats valid date", () => {
    expect(formatDate("2024-02-29")).toBe("2024-02-29");
  });

  test("handles timezone offsets", () => {
    expect(formatDate("2025-04-24T12:00:00+05:00")).toBe("2025-04-24");
  });

  test("handles sub-second precision", () => {
    expect(formatDate("2025-04-24T15:30:00.123456Z")).toBe("2025-04-24");
  });

  test("returns 'Invalid Date' for unsupported inputs like Symbol", () => {
    expect(() => formatDate(Symbol("date"))).not.toThrow();
    expect(formatDate(Symbol("date"))).toBe("Invalid Date");
  });

  test("handles edge case at end of day", () => {
    expect(formatDate("2025-04-24T23:59:59.999Z")).toBe("2025-04-24");
  });

  test("formats Date instance", () => {
    expect(formatDate(new Date("2025-04-24T00:00:00Z"))).toBe("2025-04-24");
  });

  test("returns 'Invalid Date' for NaN and Infinity", () => {
    expect(formatDate(NaN)).toBe("Invalid Date");
    expect(formatDate(Infinity)).toBe("Invalid Date");
    expect(formatDate(-Infinity)).toBe("Invalid Date");
  });

  test("returns 'Invalid Date' for objects with toString not returning a date", () => {
    const obj = { toString: () => "not-a-date" };
    expect(formatDate(obj)).toBe("Invalid Date");
  });

  test("returns 'Invalid Date' for objects with valueOf not returning a date", () => {
    const obj = { valueOf: () => "not-a-date" };
    expect(formatDate(obj)).toBe("Invalid Date");
  });
});

describe("escapeHTML", () => {
  test.each([
    ["<", "&lt;"],
    ["<div>&'\"", "&lt;div&gt;&amp;&#039;&quot;"]
  ])("escapes %p", (input, expected) => {
    expect(escapeHTML(input)).toBe(expected);
  });

  test("returns empty string for empty input", () => {
    expect(escapeHTML("")).toBe("");
    expect(escapeHTML(null)).toBe("");
    expect(escapeHTML(undefined)).toBe("");
  });

  test("does not double-escape already escaped entities", () => {
    expect(escapeHTML("&lt;div&gt;")).toBe("&amp;lt;div&amp;gt;");
  });
});
