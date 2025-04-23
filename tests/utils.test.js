import { generateCardSignatureMove } from "../utils";

// Mock data for tests
const mockGokyo = [{id: "uchi-mata", name: "Uchi Mata"}]
const mockJudoka = {signatureMoveId: "uchi-mata"}

// Helper function to generate expected HTML
const generateExpectedHTML = (label, value) => `
  <span class="signature-move-label"><strong>${label}</strong></span>
  <span class="signature-value">${value}</span>
`

describe("generateCardSignatureMove", () => {
  // Group: Valid Inputs
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Uchi Mata"))
    })

    it("selects the correct technique from multiple gokyo entries", () => {
      const extendedGokyo = [
        {id: "seoi-nage", name: "Seoi Nage"},
        {id: "uchi-mata", name: "Uchi Mata"},
        {id: "osoto-gari", name: "Osoto Gari"},
      ]
      const html = generateCardSignatureMove(mockJudoka, extendedGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Uchi Mata"))
    })
  })

  // Group: Edge Cases
  describe("Edge Cases", () => {
    it('returns "Unknown" for unmatched ID', () => {
      const html = generateCardSignatureMove({signatureMoveId: "nonexistent"}, mockGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })

    it("handles empty gokyo array gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, [])
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })

    it("handles null judoka gracefully", () => {
      const html = generateCardSignatureMove(null, mockGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })

    it("handles undefined judoka gracefully", () => {
      const html = generateCardSignatureMove(undefined, mockGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })

    it("handles null gokyo gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, null)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })

    it("handles undefined gokyo gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, undefined)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })

    it("handles empty judoka object gracefully", () => {
      const html = generateCardSignatureMove({}, mockGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })
  })

  // Group: Malformed Data
  describe("Malformed Data", () => {
    it("handles case sensitivity in signatureMoveId", () => {
      const caseInsensitiveJudoka = { signatureMoveId: "UCHI-MATA" };
      const html = generateCardSignatureMove(caseInsensitiveJudoka, mockGokyo);
    
      expect(html).toContain(`
        <div class="card-signature">
          <span class="signature-move-label"><strong>Signature Move:</strong></span>
          <span class="signature-move-value">Unknown</span>
        </div>
      `.trim());
    });

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo = [{id: "uchi-mata"}, {name: "Uchi Mata"}]
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo)
      expect(html).toContain(generateExpectedHTML("Signature Move:", "Unknown"))
    })
  })
})
