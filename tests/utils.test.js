import { describe, it, expect } from "vitest";
import { generateCardSignatureMove } from "../helpers/cardRender.js";

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
      expect(html).toContain("Uchi-mata");
    });

    it("returns a string of HTML", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(typeof html).toBe("string");
    });
  });

  describe("Edge Cases", () => {
    it('returns "Unknown" for unmatched ID', () => {
      const html = generateCardSignatureMove({ signatureMoveId: "nonexistent" }, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });

    it("handles null gokyo gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, null);
      expect(html).toContain("Jigoku-guruma");
    });

    it("handles missing signatureMoveId gracefully", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("handles null judoka gracefully", () => {
      const html = generateCardSignatureMove(null, mockGokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("handles null or undefined gokyo gracefully", () => {
      const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
      const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
      expect(htmlWithNull).toContain("Jigoku-guruma");
      expect(htmlWithUndefined).toContain("Jigoku-guruma");
    });

    it("handles missing signatureMoveId gracefully", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("handles null judoka gracefully", () => {
      const html = generateCardSignatureMove(null, mockGokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("returns 'Unknown' if gokyo name is invalid", () => {
      const invalidGokyo = { id: "uchi-mata", name: null }; // Invalid name
      const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });
});
