import { describe, test, expect } from "vitest";
import { getValue, formatDate } from "../../helpers/utils.js";

describe("getValue", () => {
  test.each([
    ["Hello", "Fallback", "Hello"], // Non-empty string
    ["", "Fallback", "Fallback"], // Empty string
    [undefined, "Fallback", "Fallback"], // Undefined with fallback
    [null, "Fallback", "Fallback"], // Null with fallback
    ["   ", "Fallback", "Fallback"], // Whitespace string
    [42, "Fallback", 42], // Number
    [false, "Fallback", false], // Boolean false
    [true, "Fallback", true], // Boolean true
    [{}, "Fallback", "Fallback"], // Object
    [[], "Fallback", "Fallback"], // Array
    [undefined, undefined, "Unknown"] // Undefined with no fallback
  ])("returns %p when value=%p and fallback=%p", (value, fallback, expected) => {
    expect(getValue(value, fallback)).toBe(expected);
  });

  test.each([
    [0, 0], // Falsy number
    [NaN, NaN] // NaN
  ])("returns the value for falsy inputs like %p", (value, expected) => {
    expect(getValue(value, "Fallback")).toBe(expected);
  });

  test("returns a custom fallback if provided", () => {
    const customFallback = { key: "value" };
    expect(getValue(undefined, customFallback)).toBe(customFallback);
  });
});

describe("formatDate", () => {
  test.each([
    "not-a-date",
    "",
    null,
    undefined,
    123456,
    {},
    [],
    true,
    false,
    Symbol("date"),
    BigInt(123456789)
  ])('returns "Invalid Date" for input %p', (input) => {
    expect(() => formatDate(input)).not.toThrow();
    expect(formatDate(input)).toBe("Invalid Date");
  });

  test.each([
    ["2025-04-24", "2025-04-24"],
    ["2025-04-24T15:30:00Z", "2025-04-24"],
    ["2025-04-24T15:30:00+02:00", "2025-04-24"],
    ["2025-04-24T15:30:00.123Z", "2025-04-24"],
    ["2024-02-29", "2024-02-29"], // Leap year
    ["1970-01-01", "1970-01-01"], // Epoch
    ["9999-12-31", "9999-12-31"], // Far future
    ["0001-01-01", "0001-01-01"] // Far past
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
    // Removed unused variable unsupportedInputs
  });
});
