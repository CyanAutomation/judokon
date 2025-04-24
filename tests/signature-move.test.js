// Imports (move config to vitest.config.js if possible)
import {generateCardSignatureMove} from "../utils"

// Mock data
const mockJudoka = {signatureMoveId: "uchi-mata"}
const mockGokyo = [{id: "uchi-mata", name: "Uchi Mata"}]

// Helper function
const extractContent = (html, selector) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const element = doc.querySelector(selector)
  return element ? element.textContent.trim() : null
}

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo)
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")
      expect(label).toBe("Signature Move:")
      expect(value).toBe("Uchi Mata")
    })

    it("selects the correct technique from multiple gokyo entries", () => {
      const extendedGokyo = [
        {id: "seoi-nage", name: "Seoi Nage"},
        {id: "uchi-mata", name: "Uchi Mata"},
        {id: "osoto-gari", name: "Osoto Gari"},
      ]
      const html = generateCardSignatureMove(mockJudoka, extendedGokyo)
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")
      expect(label).toBe("Signature Move:")
      expect(value).toBe("Uchi Mata")
    })
  })

  describe("Basic cases", () => {
    test.each([
      [{signatureMoveId: "nonexistent"}, "Unknown"],
      [{}, "Unknown"],
      [null, "Unknown"],
    ])('returns "%s" for given judoka', (input, expected) => {
      const html = generateCardSignatureMove(input, mockGokyo)
      const value = extractContent(html, ".signature-move-value")
      expect(value).toBe(expected)
    })
  })

  // Add more describe blocks for edge cases, malformed data, etc. as needed
})
