import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Numeric ID
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi-mata");
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
      [null, "Unknown"]
    ])('returns "%s" for given judoka', (input, expected) => {
      const html = generateCardSignatureMove(input, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain(expected);
    });

    it("returns 'Unknown' if no matching technique is found", () => {
      const html = generateCardSignatureMove({ signatureMoveId: 999 }, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });
  });

  describe("Edge cases", () => {
    it("returns 'Unknown' for non-numeric signatureMoveId", () => {
      const invalidJudoka = { signatureMoveId: "UCHI-MATA" };
      const html = generateCardSignatureMove(invalidJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo = {
        1: { id: "uchi-mata", name: null }, // Invalid structure
        2: { id: 2, name: "Uchi Mata" }
      };
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("returns 'Unknown' if gokyo is null or undefined", () => {
      const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
      const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
      expect(htmlWithNull).toContain("Signature Move:");
      expect(htmlWithNull).toContain("Jigoku-guruma");
      expect(htmlWithUndefined).toContain("Signature Move:");
      expect(htmlWithUndefined).toContain("Jigoku-guruma");
    });
  });
});
