import { generateCardSignatureMove } from "../../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 };
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  describe("Valid Cases", () => {
    it("should render escaped HTML to prevent XSS when technique name has special characters", () => {
      const specialGokyo = {
        1: { id: 1, name: "<script>alert('XSS')</script>" }
      };
      const html = generateCardSignatureMove(mockJudoka, specialGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
    });

    it("should correctly render special unicode characters in technique names", () => {
      const specialGokyo = {
        1: { id: 1, name: "Ō-soto-gari" }
      };
      const html = generateCardSignatureMove(mockJudoka, specialGokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Ō-soto-gari");
    });
  });

  describe("Fallback Behavior", () => {
    test.each([
      ["no matching technique id", { signatureMoveId: 999 }, mockGokyo],
      ["null gokyoLookup", mockJudoka, null],
      ["undefined gokyoLookup", mockJudoka, undefined],
      ["empty gokyoLookup", mockJudoka, {}],
      ["gokyo name is invalid", mockJudoka, { 1: { id: 1, name: null } }],
      ["missing signatureMoveId", {}, mockGokyo],
      ["invalid gokyo structure", mockJudoka, { 1: { invalidKey: "value" } }]
    ])("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });

  describe("Invalid Type Inputs", () => {
    test.each([
      ["non-object judoka (string)", "invalid-judoka", mockGokyo],
      ["non-object judoka (number)", 42, mockGokyo],
      ["non-object gokyo (string)", mockJudoka, "invalid-gokyo"],
      ["non-object gokyo (number)", mockJudoka, 12345],
      ["judoka as array", [], mockGokyo],
      ["gokyo as array", mockJudoka, []]
    ])("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });
});
