import { generateCardSignatureMove } from '../utils';

// Mock data
const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];
const mockJudoka = { signatureMoveId: "uchi-mata" };

// Helper function
const extractContent = (html, selector) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const element = doc.querySelector(selector);
  return element ? element.textContent.trim() : null;
};

describe("generateCardSignatureMove", () => {
  describe("Edge Cases", () => {
    it('returns "Unknown" for unmatched ID', () => {
      const html = generateCardSignatureMove({ signatureMoveId: "nonexistent" }, mockGokyo);
      const label = extractContent(html, ".signature-move-label");
      const value = extractContent(html, ".signature-move-value");
      expect(label).toBe("Signature Move:");
      expect(value).toBe("Unknown");
    });

    it("handles empty gokyo array gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, []);
      const label = extractContent(html, ".signature-move-label");
      const value = extractContent(html, ".signature-move-value");
      expect(label).toBe("Signature Move:");
      expect(value).toBe("Unknown");
    });

    // ...other edge case tests...
  });

  test("should match the snapshot", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toMatchSnapshot();
  });
});