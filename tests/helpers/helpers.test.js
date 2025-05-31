import { describe, test, expect } from "vitest";
import { getValue, formatDate } from "../../helpers/utils.js";

describe("getValue", () => {
  test.each([
    ["Hello", "Fallback", "Hello"],
    ["", "Fallback", "Fallback"],
    [undefined, "Fallback", "Fallback"],
    [null, "Fallback", "Fallback"],
    ["   ", "Fallback", "Fallback"],
    [42, "Fallback", 42],
    [false, "Fallback", false],
    [true, "Fallback", true],
    [{}, "Fallback", "Fallback"],
    [[], "Fallback", "Fallback"],
    [undefined, undefined, "Unknown"]
  ])("returns %p when value=%p and fallback=%p", (value, fallback, expected) => {
    expect(getValue(value, fallback)).toBe(expected);
  });

  test.each([
    [0, 0],
    [NaN, NaN]
  ])("returns the value for falsy inputs like %p", (value, expected) => {
    expect(getValue(value, "Fallback")).toBe(expected);
  });
});

describe("formatDate", () => {
  test.each(["not-a-date", "", null, undefined, 123456, {}, [], true, false, BigInt(123456789)])(
    'returns "Invalid Date" for input %p',
    (input) => {
      expect(() => formatDate(input)).not.toThrow();
      expect(formatDate(input)).toBe("Invalid Date");
    }
  );

  test.each([
    ["2025-04-24", "2025-04-24"],
    ["2025-04-24T15:30:00Z", "2025-04-24"],
    ["2025-04-24T15:30:00+02:00", "2025-04-24"],
    ["2025-04-24T15:30:00.123Z", "2025-04-24"],
    ["2024-02-29", "2024-02-29"],
    ["1970-01-01", "1970-01-01"],
    ["9999-12-31", "9999-12-31"],
    ["0001-01-01", "0001-01-01"]
  ])("formats input %p to %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test.each([
    ["2025-04-24T00:00:00Z", "2025-04-24"],
    ["2025-04-24T23:59:59Z", "2025-04-24"],
    ["2025-04-24T12:00:00+05:00", "2025-04-24"],
    ["2025-04-24T12:00:00-05:00", "2025-04-24"]
  ])("handles timezone offsets correctly for input %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test.each([
    ["2025-04-24T15:30:00.123456Z", "2025-04-24"],
    ["2025-04-24T15:30:00.000Z", "2025-04-24"],
    ["2025-04-24T15:30:00.999Z", "2025-04-24"]
  ])("handles sub-second precision correctly for input %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test("throws an error for unsupported input types", () => {
    const unsupportedInputs = [Symbol("date"), function () {}, new Map(), new Set()];
    unsupportedInputs.forEach((input) => {
      expect(() => formatDate(input)).toThrow();
    });
  });

  test("handles edge cases for valid date strings", () => {
    const edgeCases = [
      ["2025-04-24T00:00:00.000Z", "2025-04-24"],
      ["2025-04-24T23:59:59.999Z", "2025-04-24"],
      ["2025-04-24T12:00:00+00:00", "2025-04-24"],
      ["2025-04-24T12:00:00-00:00", "2025-04-24"]
    ];
    edgeCases.forEach(([input, expected]) => {
      expect(formatDate(input)).toBe(expected);
    });
  });
});
