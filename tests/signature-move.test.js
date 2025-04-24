import { generateCardSignatureMove } from "../utils";

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

  // Add more describe blocks for edge cases, malformed data, etc. as needed
});