import { describe, test, expect } from "vitest";
import { formatDate } from "../../helpers/utils.js";

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

  test("returns 'Invalid Date' for unsupported inputs like Symbol", () => {
    expect(() => formatDate(Symbol("date"))).not.toThrow();
    expect(formatDate(Symbol("date"))).toBe("Invalid Date");
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

  test.each([
    ["2025-04-24T15:30:00.123456789Z", "2025-04-24"],
    ["2025-04-24T15:30:00.000000000Z", "2025-04-24"],
    ["2025-04-24T15:30:00.999999999Z", "2025-04-24"]
  ])("handles nanosecond precision correctly for input %p", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  test.each([
    ["2025-04-24T15:30:00Z", "2025-04-24"],
    ["2025-04-24T15:30:00.123Z", "2025-04-24"],
    ["2025-04-24T15:30:00.123456Z", "2025-04-24"]
  ])(
    "does not modify valid ISO date strings with time components for input %p",
    (input, expected) => {
      expect(formatDate(input)).toBe(expected);
    }
  );
});
