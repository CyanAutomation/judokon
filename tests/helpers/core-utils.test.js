import { describe, it, expect } from "vitest";
import { generateCardSignatureMove } from "../../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 };
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  describe("Valid Cases", () => {
    it("should render the correct technique name when judoka and gokyo match", () => {
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
    it.each([
      [mockJudoka, null, "null gokyo lookup"],
      [mockJudoka, undefined, "undefined gokyo lookup"],
      [mockJudoka, {}, "empty gokyo lookup"],
      [mockJudoka, { 1: { id: 1, name: null } }, "gokyo with invalid name"],
      [{ signatureMoveId: 999 }, mockGokyo, "non-existent signatureMoveId in gokyo"],
      [{}, mockGokyo, "missing signatureMoveId in judoka object"],
      [mockJudoka, { 2: { id: 2, name: "O-soto-gari" } }, "gokyo missing matching entry"],
      [null, mockGokyo, "null judoka object"]
    ])("should fallback to 'Jigoku-guruma' when %s", (judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
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

    it("should fallback when gokyo entries are malformed", () => {
      const malformedGokyo = {
        1: { id: "uchi-mata", name: null }, // Invalid structure
        2: { id: 2, name: "Uchi Mata" }
      };
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });

  describe("Invalid Type Inputs", () => {
    it.each([
      ["non-object judoka (string)", "not-an-object", mockGokyo],
      ["non-object judoka (number)", 42, mockGokyo],
      ["judoka as array", [], mockGokyo],
      ["non-object gokyo (string)", mockJudoka, "not-an-object"],
      ["non-object gokyo (number)", mockJudoka, 12345],
      ["gokyo as array", mockJudoka, []],
      ["both judoka and gokyo are invalid", "invalid", 99]
    ])("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });
});
