import { generateCardSignatureMove } from "../utils";

// Mock data
const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];
const mockJudoka = { signatureMoveId: "uchi-mata" };

describe("generateCardSignatureMove", () => {
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

    // ...other edge case tests...
  });

  test("should match the snapshot", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toMatchSnapshot();
  });
});