import { generateCardSignatureMove } from "../../src/helpers/cardRender.js";

describe("generateCardSignatureMove", () => {
  describe("Valid Inputs", () => {
    it("should render the correct technique name in the generated HTML", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "Uchi-mata" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi-mata");
    });

    it("should return a string of HTML", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "Uchi-mata" } }
      );
      expect(typeof html).toBe("string");
    });

    it("should escape HTML in technique name", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<b>Uchi-mata</b>" } }
      );
      expect(html).toContain("&lt;b&gt;Uchi-mata&lt;/b&gt;");
      expect(html).not.toContain("<b>Uchi-mata</b>");
    });
  });

  describe("Fallback Behavior", () => {
    const fallbackCases = [
      [{ signatureMoveId: 999 }, { 1: { id: 1, name: "Uchi-mata" } }, "no matching technique id"],
      [{ signatureMoveId: 1 }, null, "null gokyo lookup"],
      [{ signatureMoveId: 1 }, undefined, "undefined gokyo lookup"],
      [{ signatureMoveId: 1 }, {}, "empty gokyo lookup"],
      [{ signatureMoveId: 1 }, { 1: { id: 1, name: null } }, "gokyo with invalid name"],
      [{}, { 1: { id: 1, name: "Uchi-mata" } }, "missing signatureMoveId in judoka object"],
      [null, { 1: { id: 1, name: "Uchi-mata" } }, "null judoka object"],
      [
        { signatureMoveId: 1 },
        { 2: { id: 2, name: "O-soto-gari" } },
        "gokyo missing entry for signatureMoveId"
      ]
    ];

    it.each(fallbackCases)(
      "should render fallback 'Signature Move:' label when %s",
      (judoka, gokyo) => {
        const html = generateCardSignatureMove(judoka, gokyo);
        expect(html).toContain("Signature Move:");
      }
    );

    it.each(fallbackCases)("should fallback to 'Jigoku-guruma' when %s", (judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("renders fallback for empty or falsy technique name", () => {
      const html = generateCardSignatureMove({ signatureMoveId: 1 }, { 1: { id: 1, name: "" } });
      expect(html).toContain("Jigoku-guruma");
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "Ō-soto-gari" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Ō-soto-gari");
    });

    it("should fallback when signatureMoveId is non-numeric", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: "UCHI-MATA" },
        { 1: { id: 1, name: "Uchi-mata" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });

    it("should fallback when gokyo entries are malformed", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: "uchi-mata", name: null }, 2: { id: 2, name: "Uchi Mata" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });

    it("should handle emoji and non-Latin characters in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "投げ技🔥" } }
      );
      expect(html).toContain("投げ技🔥");
    });
  });

  describe("Invalid Type Inputs", () => {
    const invalidInputs = [
      ["non-object judoka", "not-an-object", { 1: { id: 1, name: "Uchi-mata" } }],
      ["non-object gokyo", { signatureMoveId: 1 }, 12345],
      ["both judoka and gokyo non-objects", "string", "string"],
      ["judoka array instead of object", [], { 1: { id: 1, name: "Uchi-mata" } }],
      ["gokyo array instead of object", { signatureMoveId: 1 }, []]
    ];

    it.each(invalidInputs)(
      "should render fallback 'Signature Move:' label when %s",
      (_, judoka, gokyo) => {
        const html = generateCardSignatureMove(judoka, gokyo);
        expect(html).toContain("Signature Move:");
      }
    );

    it.each(invalidInputs)("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("does not throw for missing arguments", () => {
      expect(() => generateCardSignatureMove()).not.toThrow();
      expect(generateCardSignatureMove()).toContain("Signature Move:");
    });
  });
});
