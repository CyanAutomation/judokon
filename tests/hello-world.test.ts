import {describe, it, expect} from "vitest"

describe("Hello World Tests", () => {
  it("should return true for true", () => {
    expect(true).toBe(true)
  })

  it("should return 2 for 1 + 1", () => {
    expect(1 + 1).toBe(2)
  })
})
