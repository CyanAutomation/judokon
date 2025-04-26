import { describe, it, expect } from "vitest";
import { generateCardSignatureMove } from "../src/helpers/cardRender";

// Mock data
const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];
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
  });
});