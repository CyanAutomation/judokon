import {describe, test, expect} from "vitest"
import {getValue} from "../src/helpers/utils"

describe("getValue", () => {
  test("returns the value if it is a non-empty string", () => {
    expect(getValue("Hello")).toBe("Hello")
  })

  test("returns the fallback if the value is an empty string", () => {
    expect(getValue("", "Fallback")).toBe("Fallback")
  })

  test("returns the fallback if the value is undefined", () => {
    expect(getValue(undefined, "Fallback")).toBe("Fallback")
  })

  test("returns the fallback if the value is null", () => {
    expect(getValue(null, "Fallback")).toBe("Fallback")
  })

  test("returns the value if it is a non-string", () => {
    const numValue: number = 42
    const boolValueFalse: boolean = false
    const boolValueTrue: boolean = true
    expect(getValue(numValue, "Fallback")).toBe(42)
    expect(getValue(boolValueFalse, "Fallback")).toBe(false)
    expect(getValue(boolValueTrue, "Fallback")).toBe(true)
  })

  test("returns the fallback if the value is a whitespace string", () => {
    expect(getValue("   ", "Fallback")).toBe("Fallback")
  })

  test('returns "Unknown" if value is undefined and no fallback is provided', () => {
    expect(getValue(undefined)).toBe("Unknown")
  })

  test("returns the fallback if the value is an object", () => {
    expect(getValue({}, "Fallback")).toBe("Fallback")
  })

  test("returns the fallback if the value is an array", () => {
    expect(getValue([], "Fallback")).toBe("Fallback")
  })
})
