import { describe, it, expect } from "vitest";
import { generateCardSignatureMove } from "../../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Numeric ID
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  describe("Valid Cases", () => {
    it("returns the correct technique name when matched", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi-mata");
    });

    it("returns a string of HTML", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(typeof html).toBe("string");
    });
  });

  describe("Fallback Behavior", () => {
    it("falls back to 'Jigoku-guruma' for invalid gokyoLookup or signatureMoveId", () => {
      const invalidGokyoCases = [
        null,
        undefined,
        {},
        { 1: { id: 1, name: null } } // Invalid name
      ];
      const invalidJudokaCases = [
        {},
        { signatureMoveId: 999 }, // Non-existent ID
        { signatureMoveId: "invalid" } // Non-numeric ID
      ];

      invalidGokyoCases.forEach((gokyo) => {
        const html = generateCardSignatureMove(mockJudoka, gokyo);
        expect(html).toContain("Signature Move:");
        expect(html).toContain("Jigoku-guruma");
      });

      invalidJudokaCases.forEach((judoka) => {
        const html = generateCardSignatureMove(judoka, mockGokyo);
        expect(html).toContain("Signature Move:");
        expect(html).toContain("Jigoku-guruma");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles special characters in technique names", () => {
      const specialGokyo = {
        1: { id: 1, name: "Ō-soto-gari" }
      };
      const specialJudoka = { signatureMoveId: 1 };
      const html = generateCardSignatureMove(specialJudoka, specialGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Ō-soto-gari");
    });

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo = {
        1: { id: "uchi-mata", name: null }, // Invalid structure
        2: { id: 2, name: "Uchi Mata" }
      };
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });
});
