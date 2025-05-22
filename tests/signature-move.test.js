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

      it("returns a string of HTML", () => {
        const html = generateCardSignatureMove(mockJudoka, mockGokyo);
        expect(typeof html).toBe("string");
      });

      describe("Fallback Behavior", () => {
        it("falls back to 'Jigoku-guruma' if no matching technique is found", () => {
          const html = generateCardSignatureMove({ signatureMoveId: 999 }, mockGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
        });

        it("falls back to 'Jigoku-guruma' if gokyoLookup is null or undefined", () => {
          const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
          const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
          expect(htmlWithNull).toContain("Signature Move:");
          expect(htmlWithNull).toContain("Jigoku-guruma");
          expect(htmlWithUndefined).toContain("Signature Move:");
          expect(htmlWithUndefined).toContain("Jigoku-guruma");
        });

        it("falls back to 'Jigoku-guruma' if gokyoLookup is empty", () => {
          const emptyGokyo = {};
          const html = generateCardSignatureMove(mockJudoka, emptyGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
        });

        it("falls back to 'Jigoku-guruma' if gokyo name is invalid", () => {
          const invalidGokyo = {
            1: { id: 1, name: null } // Invalid name
          };
          const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
        });

        it("falls back to 'Jigoku-guruma' if signatureMoveId is missing", () => {
          const html = generateCardSignatureMove({}, mockGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
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

        it("handles non-numeric signatureMoveId gracefully", () => {
          const invalidJudoka = { signatureMoveId: "UCHI-MATA" };
          const html = generateCardSignatureMove(invalidJudoka, mockGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
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

        // New test: handles missing gokyo entry for a valid signatureMoveId
        it("falls back to 'Jigoku-guruma' if gokyo entry is missing for signatureMoveId", () => {
          const partialGokyo = {
            2: { id: 2, name: "O-soto-gari" } // Missing entry for ID 1
          };
          const html = generateCardSignatureMove(mockJudoka, partialGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
        });

        // New test: handles empty judoka object
        it("falls back to 'Jigoku-guruma' if judoka object is empty", () => {
          const html = generateCardSignatureMove({}, mockGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
        });

        // New test: handles null judoka object
        it("falls back to 'Jigoku-guruma' if judoka is null", () => {
          const html = generateCardSignatureMove(null, mockGokyo);
          expect(html).toContain("Signature Move:");
          expect(html).toContain("Jigoku-guruma");
        });
      });
    });

    it("falls back to 'Jigoku-guruma' if gokyoLookup is null or undefined", () => {
      const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
      const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
      expect(htmlWithNull).toContain("Signature Move:");
      expect(htmlWithNull).toContain("Jigoku-guruma");
      expect(htmlWithUndefined).toContain("Signature Move:");
      expect(htmlWithUndefined).toContain("Jigoku-guruma");
    });

    it("falls back to 'Jigoku-guruma' if gokyoLookup is empty", () => {
      const emptyGokyo = {};
      const html = generateCardSignatureMove(mockJudoka, emptyGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });

    it("falls back to 'Jigoku-guruma' if gokyo name is invalid", () => {
      const invalidGokyo = {
        1: { id: 1, name: null } // Invalid name
      };
      const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });

    it("falls back to 'Jigoku-guruma' if signatureMoveId is missing", () => {
      const html = generateCardSignatureMove({}, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
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

    it("handles non-numeric signatureMoveId gracefully", () => {
      const invalidJudoka = { signatureMoveId: "UCHI-MATA" };
      const html = generateCardSignatureMove(invalidJudoka, mockGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
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
