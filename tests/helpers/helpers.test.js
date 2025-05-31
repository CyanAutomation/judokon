import { describe, test, expect } from "vitest";
import { getValue } from "../../helpers/utils.js";

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
  ])("returns %p for input %p with fallback %p", (value, fallback, expected) => {
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
    expect(getValue(null, customFallback)).toBe(customFallback);
  });
});
