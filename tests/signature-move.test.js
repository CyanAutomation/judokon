import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Numeric ID
const mockGokyo = { id: 1, name: "Uchi-mata" }; // Numeric ID and matching name

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
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
      [null, "Unknown"]
    ])('returns "%s" for given judoka', (input, expected) => {
      const html = generateCardSignatureMove(input, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain(expected);
    });

    it("returns HTML with technique name", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi-mata");
    });

    it("returns 'Unknown' if no matching technique is found", () => {
      const html = generateCardSignatureMove({ signatureMoveId: "nonexistent" }, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
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

    it("returns 'Unknown' if signatureMoveId is missing", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("returns 'Unknown' if gokyo is null or undefined", () => {
      const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
      const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
      expect(htmlWithNull).toContain("Signature Move:");
      expect(htmlWithNull).toContain("Unknown");
      expect(htmlWithUndefined).toContain("Signature Move:");
      expect(htmlWithUndefined).toContain("Unknown");
    });

    it("returns 'Unknown' if gokyo name is invalid", () => {
      const invalidGokyo = { id: "uchi-mata", name: null }; // Invalid name
      const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });
  });
});
