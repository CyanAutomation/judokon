import { generateCardSignatureMove } from "../utils/cardRender";

// Mock data
const mockJudoka = { signatureMoveId: "uchi-mata" };
const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi Mata");
    });

    it("selects the correct technique from multiple gokyo entries", () => {
      const extendedGokyo = [
        { id: "seoi-nage", name: "Seoi Nage" },
        { id: "uchi-mata", name: "Uchi Mata" },
        { id: "osoto-gari", name: "Osoto Gari" },
      ];
      const html = generateCardSignatureMove(mockJudoka, extendedGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi Mata");
    });

    it("returns a string of HTML", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(typeof html).toBe("string");
    });
  });

  describe("Basic cases", () => {
    test.each([
      [{ signatureMoveId: "nonexistent" }, "Unknown"],
      [{}, "Unknown"],
      [null, "Unknown"],
    ])('returns "%s" for given judoka', (input, expected) => {
      const html = generateCardSignatureMove(input, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain(expected);
    });
  });

  describe("Edge cases", () => {
    it("returns 'Unknown' for case-insensitive mismatch", () => {
      const caseInsensitiveJudoka = { signatureMoveId: "UCHI-MATA" };
      const html = generateCardSignatureMove(caseInsensitiveJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo = [{ id: "uchi-mata" }, { name: "Uchi Mata" }];
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("returns 'Unknown' if gokyo is not an array", () => {
      const html = generateCardSignatureMove(mockJudoka, null);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("returns 'Unknown' if signatureMoveId is missing", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });
  });
});