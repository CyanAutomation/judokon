import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["test/setup.js"],
  },
})

const mockJudoka = {signatureMoveId: "uchi-mata"}
const mockGokyo = [{id: "uchi-mata", name: "Uchi Mata"}]

const extractContent = (html, selector) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const element = doc.querySelector(selector)
  return element ? element.textContent.trim() : null
}

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
