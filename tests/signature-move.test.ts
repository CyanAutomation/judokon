import {generateCardSignatureMove} from "../src/helpers/cardRender.ts"

interface Judoka {
  signatureMoveId?: string
}

interface GokyoEntry {
  id?: string
  name?: string
}

// Mock data
const mockJudoka: Judoka = {signatureMoveId: "uchi-mata"}
const mockGokyo: GokyoEntry[] = [{id: "uchi-mata", name: "Uchi Mata"}]

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo)
      expect(html).toContain("Signature Move:")
      expect(html).toContain("Uchi Mata")
    })

    it("selects the correct technique from multiple gokyo entries", () => {
      const extendedGokyo: GokyoEntry[] = [
        {id: "seoi-nage", name: "Seoi Nage"},
        {id: "uchi-mata", name: "Uchi Mata"},
        {id: "osoto-gari", name: "Osoto Gari"},
      ]
      const html = generateCardSignatureMove(mockJudoka, extendedGokyo)
      expect(html).toContain("Signature Move:")
      expect(html).toContain("Uchi Mata")
    })

    it("returns a string of HTML", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo)
      expect(typeof html).toBe("string")
    })
  })

  describe("Basic cases", () => {
    test.each([
      [{signatureMoveId: "nonexistent"} as Judoka, "Unknown"],
      [{} as Judoka, "Unknown"],
      [null as unknown as Judoka, "Unknown"],
    ])('returns "%s" for given judoka', (input: Judoka, expected: string) => {
      const html = generateCardSignatureMove(input, mockGokyo)
      expect(html).toContain("Signature Move:")
      expect(html).toContain(expected)
    })
  })

  describe("Edge cases", () => {
    it("returns 'Unknown' for case-insensitive mismatch", () => {
      const caseInsensitiveJudoka: Judoka = {signatureMoveId: "UCHI-MATA"}
      const html = generateCardSignatureMove(caseInsensitiveJudoka, mockGokyo)
      expect(html).toContain("Signature Move:")
      expect(html).toContain("Unknown")
    })

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo: GokyoEntry[] = [{id: "uchi-mata"}, {name: "Uchi Mata"}]
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo)
      expect(html).toContain("Signature Move:")
      expect(html).toContain("Unknown")
    })

    it("returns 'Unknown' if gokyo is not an array", () => {
      const html = generateCardSignatureMove(mockJudoka, null as unknown as GokyoEntry[])
      expect(html).toContain("Signature Move:")
      expect(html).toContain("Unknown")
    })

    it("returns 'Unknown' if signatureMoveId is missing", () => {
      const html = generateCardSignatureMove({} as Judoka, mockGokyo)
      expect(html).toContain("Signature Move:")
      expect(html).toContain("Unknown")
    })
  })
})
