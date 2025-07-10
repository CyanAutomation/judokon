// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateCardSignatureMove } from "../../src/helpers/cardRender.js";

describe("generateCardSignatureMove", () => {
  describe("Valid Cases", () => {
    it("should render the correct technique name when judoka and gokyo match", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "Uchi-mata" }, 2: { id: 2, name: "O-soto-gari" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Uchi-mata");
    });

    it("should return a string of HTML", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "Uchi-mata" }, 2: { id: 2, name: "O-soto-gari" } }
      );
      expect(typeof html).toBe("string");
    });
  });

  describe("Fallback Behavior", () => {
    const fallbackCases = [
      [{ signatureMoveId: 1 }, null, "null gokyo lookup"],
      [{ signatureMoveId: 1 }, undefined, "undefined gokyo lookup"],
      [{ signatureMoveId: 1 }, {}, "empty gokyo lookup"],
      [{ signatureMoveId: 1 }, { 1: { id: 1, name: null } }, "gokyo with invalid name"],
      [{ signatureMoveId: 1 }, { 1: { id: 1, name: "" } }, "empty technique name"],
      [
        { signatureMoveId: 999 },
        { 1: { id: 1, name: "Uchi-mata" } },
        "non-existent signatureMoveId in gokyo"
      ],
      [
        { signatureMoveId: "UCHI-MATA" },
        { 1: { id: 1, name: "Uchi-mata" } },
        "non-numeric signatureMoveId"
      ],
      [{}, { 1: { id: 1, name: "Uchi-mata" } }, "missing signatureMoveId in judoka object"],
      [
        { signatureMoveId: 1 },
        { 2: { id: 2, name: "O-soto-gari" } },
        "gokyo missing matching entry"
      ],
      [{ signatureMoveId: 1 }, { 1: { invalidKey: "value" } }, "invalid gokyo structure"],
      [null, { 1: { id: 1, name: "Uchi-mata" } }, "null judoka object"]
    ];

    it.each(fallbackCases)(
      "should render 'Signature Move:' label for fallback case: %s",
      (judoka, gokyo) => {
        const html = generateCardSignatureMove(judoka, gokyo);
        expect(html).toContain("Signature Move:");
      }
    );

    it.each(fallbackCases)(
      "should fallback to 'Jigoku-guruma' for fallback case: %s",
      (judoka, gokyo) => {
        const html = generateCardSignatureMove(judoka, gokyo);
        expect(html).toContain("Jigoku-guruma");
      }
    );
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

    it("should handle emoji and non-Latin characters in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "投げ技🔥" } }
      );
      expect(html).toContain("投げ技🔥");
    });

    it("should fallback when gokyo entries are malformed", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: "uchi-mata", name: null }, 2: { id: 2, name: "Uchi Mata" } }
      );
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });

  describe("Invalid Type Inputs", () => {
    const invalidInputs = [
      ["judoka as string", "not-an-object", { 1: { id: 1, name: "Uchi-mata" } }],
      ["judoka as number", 42, { 1: { id: 1, name: "Uchi-mata" } }],
      ["judoka as array", [], { 1: { id: 1, name: "Uchi-mata" } }],
      ["gokyo as string", { signatureMoveId: 1 }, "not-an-object"],
      ["gokyo as number", { signatureMoveId: 1 }, 12345],
      ["gokyo as array", { signatureMoveId: 1 }, []],
      ["both judoka and gokyo invalid", "invalid", 99]
    ];

    it.each(invalidInputs)("should render 'Signature Move:' label when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
    });

    it.each(invalidInputs)("should fallback to 'Jigoku-guruma' when %s", (_, judoka, gokyo) => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Jigoku-guruma");
    });

    it("does not throw for missing arguments", () => {
      expect(() => generateCardSignatureMove()).not.toThrow();
      expect(generateCardSignatureMove()).toContain("Signature Move:");
    });
  });

  describe("HTML Safety and Formatting", () => {
    it("should not include <script> tags in output", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<script>alert(1)</script>" } }
      );
      expect(html).not.toMatch(/<script>/i);
    });

    it("escapes HTML tags in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<b>Uchi-mata</b>" } }
      );
      expect(html).toContain("&lt;b&gt;Uchi-mata&lt;/b&gt;");
      expect(html).not.toContain("<b>Uchi-mata</b>");
    });

    it("escapes script content to prevent XSS", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<script>alert('XSS')</script>" } }
      );
      expect(html).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
    });

    it("escapes additional malicious tags", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "<img src=x onerror=alert('XSS')>" } }
      );
      expect(html).toContain("&lt;img src=x onerror=alert(&#039;XSS&#039;)&gt;");
    });

    it("does not double-escape already escaped entities", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "&lt;b&gt;alert(1)&lt;/b&gt;" } }
      );
      expect(html).toContain("&lt;b&gt;alert(1)&lt;/b&gt;");
    });

    it("should trim whitespace from technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "  Uchi-mata  " } }
      );
      expect(html).toContain("Uchi-mata");
    });

    it("should handle HTML entities in technique names", () => {
      const html = generateCardSignatureMove(
        { signatureMoveId: 1 },
        { 1: { id: 1, name: "O-soto-gari &amp; Tomoe-nage" } }
      );
      expect(html).toContain("O-soto-gari &amp; Tomoe-nage");
    });
  });
});
