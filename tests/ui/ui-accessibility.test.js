import { generateCardSignatureMove } from "../../src/helpers/cardRender.js";

describe("generateCardSignatureMove", () => {
  describe("Security - XSS Prevention", () => {
    it("should escape HTML to prevent XSS when technique name has special characters", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<script>alert('XSS')</script>" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
      expect(html).not.toContain("<script>alert('XSS')</script>");
    });

    it("should escape additional malicious tags", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<img src=x onerror=alert('XSS')>" } }
      );
      expect(html).toContain("&lt;img src=x onerror=alert(&#039;XSS&#039;)&gt;");
      expect(html).not.toContain("<img src=x onerror=alert('XSS')>");
    });

    it("does not double-escape already escaped entities", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "&lt;b&gt;alert(1)&lt;/b&gt;" } }
      );
      // Should escape ampersands but not double-escape < or >
      expect(html).toContain("&amp;lt;b&amp;gt;alert(1)&amp;lt;/b&amp;gt;");
    });
  });

  describe("Accessibility - Unicode Handling", () => {
    it("should correctly render special unicode characters in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "Ō-soto-gari" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Ō-soto-gari");
    });

    it("renders emoji and non-Latin characters in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "投げ技🔥" } }
      );
      expect(html).toContain("投げ技🔥");
    });
  });

  describe("Fallback Behavior", () => {
    const fallbackCases = [
      ["no matching technique id", { signatureMoveId: 999 }, { 1: { id: 1, name: "Uchi-mata" } }],
      ["null gokyoLookup", { signatureMoveId: 1 }, null],
      ["undefined gokyoLookup", { signatureMoveId: 1 }, undefined],
      ["empty gokyoLookup", { signatureMoveId: 1 }, {}],
      ["gokyo name is invalid", { signatureMoveId: 1 }, { 1: { id: 1, name: null } }],
      ["missing signatureMoveId", {}, { 1: { id: 1, name: "Uchi-mata" } }],
      ["invalid gokyo structure", { signatureMoveId: 1 }, { 1: { invalidKey: "value" } }]
    ];

    it.each(fallbackCases)("should render 'Signature Move:' label when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
    });

    it.each(fallbackCases)("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("renders fallback for empty or null technique name", () => {
      const html = generateCardSignatureMove({ signatureMoveId: 1 }, { 1: { id: 1, name: "" } });
      expect(html).toContain("Jigoku-guruma");
    });
  });

  describe("Invalid Type Inputs", () => {
    const invalidInputs = [
      ["non-object judoka (string)", "invalid-judoka", { 1: { id: 1, name: "Uchi-mata" } }],
      ["non-object judoka (number)", 42, { 1: { id: 1, name: "Uchi-mata" } }],
      ["non-object gokyo (string)", { signatureMoveId: 1 }, "invalid-gokyo"],
      ["non-object gokyo (number)", { signatureMoveId: 1 }, 12345],
      ["judoka as array", [], { 1: { id: 1, name: "Uchi-mata" } }],
      ["gokyo as array", { signatureMoveId: 1 }, []]
    ];

    it.each(invalidInputs)("should render 'Signature Move:' label when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
    });

    it.each(invalidInputs)("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("does not throw for completely missing arguments", () => {
      expect(() => generateCardSignatureMove()).not.toThrow();
      expect(generateCardSignatureMove()).toContain("Signature Move:");
    });
  });
});
