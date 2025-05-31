import { formatDate } from "../../helpers/utils.js";

describe("formatDate", () => {
  test("formats YYYY-MM-DD correctly", () => {
    expect(formatDate("2025-04-24")).toBe("2025-04-24");
  });

  test("formats ISO date-time string correctly", () => {
    expect(formatDate("2025-04-24T15:30:00Z")).toBe("2025-04-24");
  });

  test('returns "Invalid Date" for bad input', () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });

  test('returns "Invalid Date" for empty string', () => {
    expect(formatDate("")).toBe("Invalid Date");
  });

  test('returns "Invalid Date" for null', () => {
    expect(formatDate(null)).toBe("Invalid Date");
  });

  test('returns "Invalid Date" for undefined', () => {
    expect(formatDate(undefined)).toBe("Invalid Date");
  });

  test('returns "Invalid Date" for number input', () => {
    expect(formatDate(123456)).toBe("Invalid Date");
  });

  test('returns "Invalid Date" for object input', () => {
    expect(formatDate({})).toBe("Invalid Date");
  });

  test("formats leap year date correctly", () => {
    expect(formatDate("2024-02-29")).toBe("2024-02-29");
  });

  test("formats edge date correctly", () => {
    expect(formatDate("1970-01-01")).toBe("1970-01-01");
  });

  test("formats date with time zone offset correctly", () => {
    expect(formatDate("2025-04-24T15:30:00+02:00")).toBe("2025-04-24");
  });

  test("formats date with milliseconds correctly", () => {
    expect(formatDate("2025-04-24T15:30:00.123Z")).toBe("2025-04-24");
  });

  test('returns "Invalid Date" for array input', () => {
    expect(formatDate([])).toBe("Invalid Date");
  });

  test('returns "Invalid Date" for boolean input', () => {
    expect(formatDate(true)).toBe("Invalid Date");
    expect(formatDate(false)).toBe("Invalid Date");
  });

  test("handles extremely large date strings", () => {
    expect(formatDate("9999-12-31")).toBe("9999-12-31");
  });

  test("handles extremely small date strings", () => {
    expect(formatDate("0001-01-01")).toBe("0001-01-01");
  });
});
