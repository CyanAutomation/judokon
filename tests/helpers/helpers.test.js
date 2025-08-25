// @vitest-environment node
import { describe, test, expect } from "vitest";
import { formatDate, escapeHTML } from "../../src/helpers/utils.js";

describe("formatDate", () => {
  test.each(["not-a-date", null])('returns "Invalid Date" for input %p', (input) => {
    expect(() => formatDate(input)).not.toThrow();
    expect(formatDate(input)).toBe("Invalid Date");
  });

  test.each(["2025-02-30", "2025-13-01"])(
    'returns "Invalid Date" for impossible calendar date %p',
    (input) => {
      expect(formatDate(input)).toBe("Invalid Date");
    }
  );

  test.each([
    ["2025-04-24", "2025-04-24"],
    ["2024-02-29", "2024-02-29"]
  ])("formats input %p to %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test.each([
    ["2025-04-24T12:00:00+05:00", "2025-04-24"],
    ["2025-04-24T12:00:00-05:00", "2025-04-24"]
  ])("handles timezone offsets correctly for input %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test.each([
    ["2025-04-24T15:30:00.123456Z", "2025-04-24"],
    ["2025-04-24T15:30:00.999Z", "2025-04-24"]
  ])("handles sub-second precision correctly for input %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test("returns 'Invalid Date' for unsupported inputs like Symbol", () => {
    expect(() => formatDate(Symbol("date"))).not.toThrow();
    expect(formatDate(Symbol("date"))).toBe("Invalid Date");
  });

  test("handles edge cases for valid date strings", () => {
    const edgeCases = [
      ["2025-04-24T00:00:00.000Z", "2025-04-24"],
      ["2025-04-24T23:59:59.999Z", "2025-04-24"]
    ];
    edgeCases.forEach(([input, expected]) => {
      expect(formatDate(input)).toBe(expected);
    });
  });

  test.each([
    ["2025-04-24T15:30:00.123456789Z", "2025-04-24"],
    ["2025-04-24T15:30:00.999999999Z", "2025-04-24"]
  ])("handles nanosecond precision correctly for input %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test.each([
    ["2025-04-24T15:30:00Z", "2025-04-24"],
    ["2025-04-24T15:30:00.123Z", "2025-04-24"]
  ])(
    "does not modify valid ISO date strings with time components for input %p",
    (input, expected) => {
      expect(formatDate(input)).toBe(expected);
    }
  );

  test.each([
    [new Date("2025-04-24T00:00:00Z"), "2025-04-24"],
    [new Date("2024-02-29T23:59:59Z"), "2024-02-29"]
  ])("formats Date instance %p to %p", (dateObj, expected) => {
    expect(formatDate(dateObj)).toBe(expected);
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
