import {generateCardSignatureMove} from "../utils"
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test/setup.js'],
  },
});

// Mock data for tests
const mockGokyo = [{id: "uchi-mata", name: "Uchi Mata"}]
const mockJudoka = {signatureMoveId: "uchi-mata"}

// Helper function to extract key content from HTML
const extractContent = (html, selector) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const element = doc.querySelector(selector)
  return element ? element.textContent.trim() : null
}

test.each([
  [{signatureMoveId: "nonexistent"}, "Unknown"],
  [{}, "Unknown"],
  [null, "Unknown"],
])('returns "%s" for given judoka', (input, expected) => {
  const html = generateCardSignatureMove(input, gokyo)
  const value = extractContent(html, ".signature-move-value")
  expect(value).toBe(expected)
})

describe("generateCardSignatureMove", () => {
  // Group: Valid Inputs
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo)

      // Extract and verify content
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

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Uchi Mata")
    })
  })

  describe("generateCardTopBar", () => {
    describe("Accessibility", () => {
      test("should have no accessibility violations", async () => {
        const judoka = {
          firstname: "Clarisse",
          surname: "Agbegnenou",
          country: "fr",
        }
        const result = generateCardTopBar(judoka, "https://flagcdn.com/w320/fr.png")

        const container = document.createElement("div")
        container.innerHTML = result.html

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
      test("should have appropriate alt text", () => {
        const result = generateCardTopBar(judoka, flagUrl)
        const container = document.createElement("div")
        container.innerHTML = result.html
        const img = container.querySelector("img")
        expect(img).toHaveAttribute("alt", "France flag")
      })
    })
  })

  // Group: Edge Cases
  describe("Edge Cases", () => {
    it('returns "Unknown" for unmatched ID', () => {
      const html = generateCardSignatureMove({signatureMoveId: "nonexistent"}, mockGokyo)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })

    it("handles empty gokyo array gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, [])

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })

    it("handles null judoka gracefully", () => {
      const html = generateCardSignatureMove(null, mockGokyo)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })

    it("handles undefined judoka gracefully", () => {
      const html = generateCardSignatureMove(undefined, mockGokyo)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })

    it("handles null gokyo gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, null)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })

    it("handles empty judoka object gracefully", () => {
      const html = generateCardSignatureMove({}, mockGokyo)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })
  })

  // Group: Malformed Data
  describe("Malformed Data", () => {
    it("handles case sensitivity in signatureMoveId", () => {
      const caseInsensitiveJudoka = {signatureMoveId: "UCHI-MATA"}
      const html = generateCardSignatureMove(caseInsensitiveJudoka, mockGokyo)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo = [{id: "uchi-mata"}, {name: "Uchi Mata"}]
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo)

      // Extract and verify content
      const label = extractContent(html, ".signature-move-label")
      const value = extractContent(html, ".signature-move-value")

      expect(label).toBe("Signature Move:")
      expect(value).toBe("Unknown")
    })
  })

  test("should match the snapshot", () => {
    const html = generateCardSignatureMove(judoka, gokyo)
    expect(html).toMatchSnapshot()
  })
})
