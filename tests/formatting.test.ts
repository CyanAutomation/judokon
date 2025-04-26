import {formatDate} from "../src/helpers/utils"

describe("formatDate", () => {
  test("formats YYYY-MM-DD correctly", () => {
    expect(formatDate("2025-04-24")).toBe("2025-04-24")
  })

  test("formats ISO date-time string correctly", () => {
    expect(formatDate("2025-04-24T15:30:00Z")).toBe("2025-04-24")
  })

  test('returns "Invalid Date" for bad input', () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date")
  })

  test('returns "Invalid Date" for empty string', () => {
    expect(formatDate("")).toBe("Invalid Date")
  })

  test('returns "Invalid Date" for null', () => {
    expect(formatDate(null as unknown as string)).toBe("Invalid Date")
  })

  test('returns "Invalid Date" for undefined', () => {
    expect(formatDate(undefined as unknown as string)).toBe("Invalid Date")
  })

  test('returns "Invalid Date" for number input', () => {
    expect(formatDate(123456 as unknown as string)).toBe("Invalid Date")
  })

  test('returns "Invalid Date" for object input', () => {
    expect(formatDate({} as unknown as string)).toBe("Invalid Date")
  })

  test("formats leap year date correctly", () => {
    expect(formatDate("2024-02-29")).toBe("2024-02-29")
  })

  test("formats edge date correctly", () => {
    expect(formatDate("1970-01-01")).toBe("1970-01-01")
  })
})
