import { describe, it, expect } from "vitest";
import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockGokyo = { id: "uchi-mata", name: "Uchi Mata" }; // Single technique
const mockJudoka = { signatureMoveId: "uchi-mata" };

describe("generateCardSignatureMove", () => {
  describe("Valid Cases", () => {
    it("returns the correct technique name when matched", () => {
      const html = generateCardSignatureMove(mockJudoka, mockGokyo);
      expect(html).toContain("Uchi Mata");
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
      expect(html).toContain("Unknown");
    });

    it("handles empty gokyo array gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, []);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });

    it("handles null gokyo gracefully", () => {
      const html = generateCardSignatureMove(mockJudoka, null);
      expect(html).toContain("Unknown");
    });

    it("handles missing signatureMoveId gracefully", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Unknown");
    });

    it("handles null judoka gracefully", () => {
      const html = generateCardSignatureMove(null, mockGokyo);
      expect(html).toContain("Unknown");
    });

    it("handles malformed gokyo entries gracefully", () => {
      const malformedGokyo = [{ id: "uchi-mata" }, { name: "Uchi Mata" }];
      const html = generateCardSignatureMove(mockJudoka, malformedGokyo);
      expect(html).toContain("Unknown");
    });

    it("handles null or undefined gokyo gracefully", () => {
      const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
      const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
      expect(htmlWithNull).toContain("Unknown");
      expect(htmlWithUndefined).toContain("Unknown");
    });

    it("handles missing signatureMoveId gracefully", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Unknown");
    });

    it("handles null judoka gracefully", () => {
      const html = generateCardSignatureMove(null, mockGokyo);
      expect(html).toContain("Unknown");
    });

    it("returns 'Unknown' if gokyo name is invalid", () => {
      const invalidGokyo = { id: "uchi-mata", name: null }; // Invalid name
      const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Unknown");
    });
  });
});
