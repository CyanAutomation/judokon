import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as cardRender from "../../src/helpers/cardRender.js";

// Helper to parse HTML strings for testing
const parseHtmlFragment = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
};

describe("cardRender", () => {
  describe("generateCardPortrait", () => {
    describe("validation", () => {
      it("throws when card is null", () => {
        expect(() => cardRender.generateCardPortrait(null)).toThrow(
          "Card object is required and must be a valid object"
        );
      });

      it("throws when card is undefined", () => {
        expect(() => cardRender.generateCardPortrait(undefined)).toThrow(
          "Card object is required and must be a valid object"
        );
      });

      it("throws when card is not an object", () => {
        expect(() => cardRender.generateCardPortrait("not an object")).toThrow(
          "Card object is required and must be a valid object"
        );
      });

      it("throws when card is missing required field: id", () => {
        const card = { firstname: "John", surname: "Doe" };
        expect(() => cardRender.generateCardPortrait(card)).toThrow(
          "Card is missing required fields: id"
        );
      });

      it("throws when card is missing required field: firstname", () => {
        const card = { id: 1, surname: "Doe" };
        expect(() => cardRender.generateCardPortrait(card)).toThrow(
          "Card is missing required fields: firstname"
        );
      });

      it("throws when card is missing required field: surname", () => {
        const card = { id: 1, firstname: "John" };
        expect(() => cardRender.generateCardPortrait(card)).toThrow(
          "Card is missing required fields: surname"
        );
      });

      it("throws when card is missing multiple required fields", () => {
        const card = { id: 1 };
        expect(() => cardRender.generateCardPortrait(card)).toThrow(
          "Card is missing required fields: firstname, surname"
        );
      });

      it("throws when required field is null", () => {
        const card = { id: 1, firstname: null, surname: "Doe" };
        expect(() => cardRender.generateCardPortrait(card)).toThrow(
          "Card is missing required fields: firstname"
        );
      });
    });

    describe("HTML structure", () => {
      it("returns a string containing portrait HTML", () => {
        const card = { id: 1, firstname: "John", surname: "Doe" };
        const result = cardRender.generateCardPortrait(card);
        expect(typeof result).toBe("string");
        expect(result).toContain("card-portrait");
      });

      it("includes a div with class 'card-portrait'", () => {
        const card = { id: 42, firstname: "Jane", surname: "Smith" };
        const result = cardRender.generateCardPortrait(card);
        const wrapper = parseHtmlFragment(result);
        const portraitDiv = wrapper.querySelector(".card-portrait");
        expect(portraitDiv).toBeTruthy();
      });

      it("includes an img element inside the portrait div", () => {
        const card = { id: 99, firstname: "Alice", surname: "Wonder" };
        const result = cardRender.generateCardPortrait(card);
        const wrapper = parseHtmlFragment(result);
        const img = wrapper.querySelector(".card-portrait img");
        expect(img).toBeTruthy();
      });
    });

    describe("lazy loading and placeholders", () => {
      it("sets the src to generic placeholder portrait", () => {
        const card = { id: 5, firstname: "Bob", surname: "Builder" };
        const result = cardRender.generateCardPortrait(card);
        const wrapper = parseHtmlFragment(result);
        const img = wrapper.querySelector("img");
        expect(img?.getAttribute("src")).toContain("judokaPortrait-1.png");
      });

      it("stores the real portrait URL in data-portrait-src attribute", () => {
        const card = { id: 123, firstname: "Charlie", surname: "Brown" };
        const result = cardRender.generateCardPortrait(card);
        const wrapper = parseHtmlFragment(result);
        const img = wrapper.querySelector("img");
        expect(img?.getAttribute("data-portrait-src")).toContain("judokaPortrait-123.png");
      });

      it("includes loading='lazy' attribute", () => {
        const card = { id: 7, firstname: "Diana", surname: "Prince" };
        const result = cardRender.generateCardPortrait(card);
        const wrapper = parseHtmlFragment(result);
        const img = wrapper.querySelector("img");
        expect(img?.getAttribute("loading")).toBe("lazy");
      });

      it("includes onerror handler that falls back to placeholder", () => {
        const card = { id: 10, firstname: "Eve", surname: "Online" };
        const result = cardRender.generateCardPortrait(card);
        expect(result).toContain("onerror=");
        expect(result).toContain("judokaPortrait-0.png");
      });
    });

    describe("XSS prevention", () => {
      it("escapes HTML in firstname", () => {
        const card = { id: 1, firstname: "<script>alert('xss')</script>", surname: "Test" };
        const result = cardRender.generateCardPortrait(card);
        expect(result).not.toContain("<script>");
        expect(result).toContain("&lt;script&gt;");
      });

      it("escapes HTML in surname", () => {
        const card = { id: 1, firstname: "Test", surname: "<img src=x onerror=alert(1)>" };
        const result = cardRender.generateCardPortrait(card);
        expect(result).not.toContain("<img src=x");
        expect(result).toContain("&lt;img");
      });

      it("escapes special characters", () => {
        const card = { id: 1, firstname: "O'Connor", surname: 'Smith"Junior' };
        const result = cardRender.generateCardPortrait(card);
        // Check the raw HTML string for escaped characters
        expect(result).toContain("O&#039;Connor");
        expect(result).toContain("Smith&quot;Junior");
      });
    });

    describe("accessibility", () => {
      it("includes alt attribute with full name", () => {
        const card = { id: 1, firstname: "Grace", surname: "Hopper" };
        const result = cardRender.generateCardPortrait(card);
        const wrapper = parseHtmlFragment(result);
        const img = wrapper.querySelector("img");
        expect(img?.hasAttribute("alt")).toBe(true);
        expect(img?.getAttribute("alt")).toContain("Grace");
        expect(img?.getAttribute("alt")).toContain("Hopper");
      });

      it("alt text includes escaped names", () => {
        const card = { id: 1, firstname: "<b>Bold</b>", surname: "Name" };
        const result = cardRender.generateCardPortrait(card);
        // Check the raw HTML string for escaped tags
        expect(result).toContain("&lt;b&gt;Bold&lt;/b&gt;");
      });
    });
  });

  describe("generateCardStats", () => {
    describe("validation", () => {
      it("throws when card is null", async () => {
        await expect(cardRender.generateCardStats(null)).rejects.toThrow(
          "Card object is required and must be a valid object"
        );
      });

      it("throws when card is undefined", async () => {
        await expect(cardRender.generateCardStats(undefined)).rejects.toThrow(
          "Card object is required and must be a valid object"
        );
      });

      it("throws when card is not an object", async () => {
        await expect(cardRender.generateCardStats("not an object")).rejects.toThrow(
          "Card object is required and must be a valid object"
        );
      });

      it("throws when card.stats is null", async () => {
        const card = { stats: null };
        await expect(cardRender.generateCardStats(card)).rejects.toThrow(
          "Card.stats is required and must be a valid object"
        );
      });

      it("throws when card.stats is undefined", async () => {
        const card = {};
        await expect(cardRender.generateCardStats(card)).rejects.toThrow(
          "Card.stats is required and must be a valid object"
        );
      });

      it("throws when card.stats is not an object", async () => {
        const card = { stats: "not an object" };
        await expect(cardRender.generateCardStats(card)).rejects.toThrow(
          "Card.stats is required and must be a valid object"
        );
      });
    });

    describe("HTML structure", () => {
      it("returns a string containing stats HTML", async () => {
        const card = {
          stats: { power: 9, speed: 6, technique: 7, kumikata: 7, newaza: 8 }
        };
        const result = await cardRender.generateCardStats(card);
        expect(typeof result).toBe("string");
        expect(result).toContain("card-stats");
      });

      it("includes a container with class 'card-stats'", async () => {
        const card = {
          stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
        };
        const result = await cardRender.generateCardStats(card);
        const wrapper = parseHtmlFragment(result);
        const statsContainer = wrapper.querySelector(".card-stats");
        expect(statsContainer).toBeTruthy();
      });

      it("includes stat values from the card", async () => {
        const card = {
          stats: { power: 9, speed: 6, technique: 7, kumikata: 8, newaza: 5 }
        };
        const result = await cardRender.generateCardStats(card);
        expect(result).toContain("9");
        expect(result).toContain("6");
        expect(result).toContain("7");
        expect(result).toContain("8");
        expect(result).toContain("5");
      });
    });

    describe("card type parameter", () => {
      it("defaults to 'common' when cardType is not provided", async () => {
        const card = {
          stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
        };
        const result = await cardRender.generateCardStats(card);
        const wrapper = parseHtmlFragment(result);
        const statsContainer = wrapper.querySelector(".card-stats");
        expect(statsContainer?.classList.contains("common")).toBe(true);
      });

      it("applies the provided cardType as a class", async () => {
        const card = {
          stats: { power: 8, speed: 7, technique: 9, kumikata: 8, newaza: 7 }
        };
        const result = await cardRender.generateCardStats(card, "rare");
        const wrapper = parseHtmlFragment(result);
        const statsContainer = wrapper.querySelector(".card-stats");
        expect(statsContainer?.classList.contains("rare")).toBe(true);
      });
    });

    describe("accessibility", () => {
      it("includes aria-label for screen readers", async () => {
        const card = {
          stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
        };
        const result = await cardRender.generateCardStats(card);
        const wrapper = parseHtmlFragment(result);
        const statsContainer = wrapper.querySelector(".card-stats");
        expect(statsContainer?.getAttribute("aria-label")).toBe("Judoka Stats");
      });
    });

    describe("edge cases", () => {
      it("handles empty stats object without throwing", async () => {
        const card = { stats: {} };
        await expect(cardRender.generateCardStats(card)).resolves.toBeTruthy();
      });

      it("handles stats with zero values", async () => {
        const card = {
          stats: { power: 0, speed: 0, technique: 0, kumikata: 0, newaza: 0 }
        };
        const result = await cardRender.generateCardStats(card);
        expect(result).toContain("0");
      });
    });
  });

  describe("generateCardSignatureMove", () => {
    const mockGokyo = {
      0: { id: 0, name: "Jigoku-guruma" },
      1: { id: 1, name: "Uchi-mata" },
      2: { id: 2, name: "Seoi-nage" }
    };

    describe("HTML structure", () => {
      it("returns a string containing signature move HTML", () => {
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(typeof result).toBe("string");
        expect(result).toContain("signature-move-container");
      });

      it("includes signature move label", () => {
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(result).toContain("Signature Move:");
      });

      it("includes the technique name", () => {
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(result).toContain("Uchi-mata");
      });
    });

    describe("cardType parameter", () => {
      it("defaults to 'common' when cardType is not provided", () => {
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(result).toContain("common");
      });

      it("applies the provided cardType as a class", () => {
        const judoka = { signatureMoveId: 2 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo, "legendary");
        expect(result).toContain("legendary");
      });
    });

    describe("tooltip support", () => {
      it("includes data-tooltip-id attribute", () => {
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(result).toContain('data-tooltip-id="ui.signatureBar"');
      });
    });

    describe("technique resolution", () => {
      it("resolves technique from gokyoLookup by signatureMoveId", () => {
        const judoka = { signatureMoveId: 2 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(result).toContain("Seoi-nage");
      });

      it("falls back to placeholder when signatureMoveId is not in gokyoLookup", () => {
        const judoka = { signatureMoveId: 999 };
        const result = cardRender.generateCardSignatureMove(judoka, mockGokyo);
        expect(result).toContain("Jigoku-guruma");
      });

      it("falls back when judoka is null", () => {
        const result = cardRender.generateCardSignatureMove(null, mockGokyo);
        expect(result).toContain("Jigoku-guruma");
      });

      it("falls back when judoka is undefined", () => {
        const result = cardRender.generateCardSignatureMove(undefined, mockGokyo);
        expect(result).toContain("Jigoku-guruma");
      });

      it("falls back when gokyoLookup is null", () => {
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, null);
        expect(result).toContain("Jigoku-guruma");
      });
    });

    describe("XSS prevention", () => {
      it("escapes HTML in technique names", () => {
        const maliciousGokyo = {
          0: { id: 0, name: "Jigoku-guruma" },
          1: { id: 1, name: "<script>alert('xss')</script>" }
        };
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, maliciousGokyo);
        expect(result).not.toContain("<script>");
        expect(result).toContain("&lt;script&gt;");
      });

      it("decodes then escapes HTML entities", () => {
        const gokyoWithEntities = {
          0: { id: 0, name: "Jigoku-guruma" },
          1: { id: 1, name: "Test &amp; Technique" }
        };
        const judoka = { signatureMoveId: 1 };
        const result = cardRender.generateCardSignatureMove(judoka, gokyoWithEntities);
        // Should decode &amp; to & then escape back
        expect(result).toContain("Test &amp; Technique");
      });
    });
  });
});
