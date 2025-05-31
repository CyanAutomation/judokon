import { generateCardSignatureMove } from "../../helpers/cardRender.js";

// Mock Data
const mockJudoka = { signatureMoveId: 1 };
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("should render the correct technique name in the generated HTML", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi-mata");
    });

    it("should return a string of HTML", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(typeof html).toBe("string");
    });
  });

  describe("Fallback Behavior", () => {
    const fallbackCases = [
      [{ signatureMoveId: 999 }, mockGokyo, "no matching technique id"],
      [mockJudoka, null, "null gokyo lookup"],
      [mockJudoka, undefined, "undefined gokyo lookup"],
      [mockJudoka, {}, "empty gokyo lookup"],
      [mockJudoka, { 1: { id: 1, name: null } }, "gokyo with invalid name"],
      [{}, mockGokyo, "missing signatureMoveId in judoka object"],
      [null, mockGokyo, "null judoka object"],
      [mockJudoka, { 2: { id: 2, name: "O-soto-gari" } }, "gokyo missing entry for signatureMoveId"],
    ];

    it.each(fallbackCases)(
      "should fallback to 'Jigoku-guruma' when %s",
      (judoka, gokyo, description) => {
        const html = generateCardSignatureMove(judoka, gokyo);
        expect(html).toContain("Signature Move:");
        expect(html).toContain("Jigoku-guruma");
      }
    );
  });

  describe("Edge Cases", () => {
    it("should handle special characters in technique names", () => {
      const specialGokyo = {
        1: { id: 1, name: "Ō-soto-gari" }
      };
      const specialJudoka = { signatureMoveId: 1 };
      const html = generateCardSignatureMove(specialJudoka, specialGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Ō-soto-gari");
    });

    it("should fallback when signatureMoveId is non-numeric", () => {
      const invalidJudoka = { signatureMoveId: "UCHI-MATA" };
      const html = generateCardSignatureMove(invalidJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });

    it("should fallback when gokyo entries are malformed", () => {
      const malformedGokyo = {
        1: { id: "uchi-mata", name: null }, // Bad data
        2: { id: 2, name: "Uchi Mata" }
      };
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });

  describe("Invalid Type Inputs", () => {
    it.each([
      ["non-object judoka", "not-an-object", mockGokyo],
      ["non-object gokyo", mockJudoka, 12345],
      ["both judoka and gokyo non-objects", "string", "string"],
      ["judoka array instead of object", [], mockGokyo],
      ["gokyo array instead of object", mockJudoka, []],
    ])("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });
});