// tests/cardBuilder.test.js
import { getFlagUrl } from "../helpers/countryUtils.js";
import { generateCardTopBar } from "../helpers/cardTopBar.js";
import {
  generateCardPortrait,
  generateCardStats,
  generateCardSignatureMove
} from "../helpers/cardRender.js";
import { generateJudokaCardHTML } from "../helpers/cardBuilder.js";
import { createScrollButton } from "../helpers/carouselBuilder.js";

describe("cardBuilder.js", () => {
  describe("getFlagUrl", () => {
    it("returns a valid flag URL for a given country code", () => {
      const countryCode = "us";
      const expectedUrl = "https://flagcdn.com/w320/us.png";
      expect(getFlagUrl(countryCode)).toBe(expectedUrl);
    });

    it("returns an empty string for an invalid country code", () => {
      const countryCode = "invalid";
      expect(getFlagUrl(countryCode)).toBe("");
    });
  });

  describe("generateCardTopBar", () => {
    it("returns a valid HTML string for a judoka's top bar", () => {
      const judoka = { firstname: "John", surname: "Doe", countryCode: "us" };
      const expectedHtml =
        "<div class='card-name'>John Doe</div><div class='card-flag'><img src='https://flagcdn.com/w320/us.png' alt='United States flag' /></div>";
      expect(generateCardTopBar(judoka)).toContain(expectedHtml);
    });
  });

  describe("generateCardPortrait", () => {
    it("returns a valid HTML string for a judoka's portrait", () => {
      const judoka = { portraitUrl: "https://example.com/portrait.jpg" };
      const expectedHtml =
        "<img src='https://example.com/portrait.jpg' alt='Judoka Portrait' class='portrait-image' />";
      expect(generateCardPortrait(judoka)).toContain(expectedHtml);
    });
  });

  describe("generateCardStats", () => {
    it("returns a valid HTML string for a judoka's stats", () => {
      const judoka = { power: 9, speed: 6, technique: 7, kumikata: 7, newaza: 8 };
      const expectedHtml =
        "<ul><li class='stat'><strong>POWER</strong> <span>9</span></li><li class='stat'><strong>SPEED</strong> <span>6</span></li><li class='stat'><strong>TECHNIQUE</strong> <span>7</span></li><li class='stat'><strong>KUMI-KATA</strong> <span>7</span></li><li class='stat'><strong>NE-WAZA</strong> <span>8</span></li></ul>";
      expect(generateCardStats(judoka)).toContain(expectedHtml);
    });
  });

  describe("generateCardSignatureMove", () => {
    it("returns a valid HTML string for a judoka's signature move", () => {
      const judoka = { signatureMove: "Uchi-mata" };
      const expectedHtml =
        "<div class='signature-move-container'><div class='signature-move-label'>Signature Move:</div><div class='signature-move-value'>Uchi-mata</div></div>";
      expect(generateCardSignatureMove(judoka)).toContain(expectedHtml);
    });
  });

  describe("generateJudokaCardHTML", () => {
    it("returns a valid HTML string for a judoka card", () => {
      const judoka = {
        firstname: "John",
        surname: "Doe",
        countryCode: "us",
        portraitUrl: "https://example.com/portrait.jpg",
        power: 9,
        speed: 6,
        technique: 7,
        kumikata: 7,
        newaza: 8,
        signatureMove: "Uchi-mata"
      };
      const expectedHtml =
        "<div class='judoka-card common'><div class='card-top-bar'>...</div><div class='card-portrait'>...</div><div class='card-stats'>...</div><div class='signature-move-container'>...</div></div>";
      expect(generateJudokaCardHTML(judoka)).toContain(expectedHtml);
    });
  });
});

describe("cardRender.js", () => {
  describe("generateCardPortrait", () => {
    it("returns a valid HTML string for a judoka's portrait with a valid id", () => {
      const card = { id: 1 };
      const expectedHtml =
        "<div class='card-portrait'><img src='../assets/judokaPortraits/judokaPortrait-1.png' alt='Judoka Portrait' onerror='this.src=\"../assets/judokaPortraits/judokaPortrait-0.png\"'></div>";
      expect(generateCardPortrait(card)).toContain(expectedHtml);
    });

    it("returns a valid HTML string for a judoka's portrait with an invalid id", () => {
      const card = { id: null };
      const expectedHtml =
        "<div class='card-portrait'><img src='../assets/judokaPortraits/judokaPortrait-0.png' alt='Placeholder portrait'></div>";
      expect(generateCardPortrait(card)).toContain(expectedHtml);
    });

    it("returns a valid HTML string for a judoka's portrait with a missing id", () => {
      const card = {};
      const expectedHtml =
        "<div class='card-portrait'><img src='../assets/judokaPortraits/judokaPortrait-0.png' alt='Placeholder portrait'></div>";
      expect(generateCardPortrait(card)).toContain(expectedHtml);
    });

    it("returns a valid HTML string for a judoka's portrait with an empty object", () => {
      const card = {};
      const expectedHtml =
        "<div class='card-portrait'><img src='../assets/judokaPortraits/judokaPortrait-0.png' alt='Placeholder portrait'></div>";
      expect(generateCardPortrait(card)).toContain(expectedHtml);
    });

    it("returns a valid HTML string for a judoka's portrait with a null object", () => {
      const card = null;
      const expectedHtml =
        "<div class='card-portrait'><img src='../assets/judokaPortraits/judokaPortrait-0.png' alt='Placeholder portrait'></div>";
      expect(generateCardPortrait(card)).toContain(expectedHtml);
    });
  });
});

describe("carouselBuilder.js", () => {
  describe("createScrollButton", () => {
    it("creates a scroll button with the correct class and inner HTML", () => {
      const direction = "left";
      const container = document.createElement("div");
      const scrollAmount = 100;
      const button = createScrollButton(direction, container, scrollAmount);
      expect(button.className).toBe("scroll-button left");
      expect(button.innerHTML).toBe("&lt;");
    });

    it("creates a scroll button with the correct aria-label", () => {
      const direction = "right";
      const container = document.createElement("div");
      const scrollAmount = 100;
      const button = createScrollButton(direction, container, scrollAmount);
      expect(button.getAttribute("aria-label")).toBe("Scroll Right");
    });

    describe("carouselBuilder.js", () => {
      describe("createScrollButton", () => {
        it("creates a scroll button with the correct class and inner HTML", () => {
          const direction = "left";
          const container = document.createElement("div");
          const scrollAmount = 100;
          const button = createScrollButton(direction, container, scrollAmount);
          expect(button.className).toBe("scroll-button left");
          expect(button.innerHTML).toBe("&lt;");
        });

        it("creates a scroll button with the correct aria-label", () => {
          const direction = "right";
          const container = document.createElement("div");
          const scrollAmount = 100;
          const button = createScrollButton(direction, container, scrollAmount);
          expect(button.getAttribute("aria-label")).toBe("Scroll Right");
        });

        it("adds a click event listener to the button", () => {
          const direction = "left";
          const container = document.createElement("div");
          const scrollAmount = 100;
          const button = createScrollButton(direction, container, scrollAmount);
          expect(button.onclick).toBeDefined();
        });

        it("throws an error when the direction is not 'left' or 'right'", () => {
          const direction = "up";
          const container = document.createElement("div");
          const scrollAmount = 100;
          expect(() => createScrollButton(direction, container, scrollAmount)).toThrowError(
            "Invalid direction"
          );
        });

        it("throws an error when the container is not an HTMLElement", () => {
          const direction = "left";
          const container = "not an HTMLElement";
          const scrollAmount = 100;
          expect(() => createScrollButton(direction, container, scrollAmount)).toThrowError(
            "Container must be an HTMLElement"
          );
        });

        it("throws an error when the scrollAmount is not a number", () => {
          const direction = "left";
          const container = document.createElement("div");
          const scrollAmount = "not a number";
          expect(() => createScrollButton(direction, container, scrollAmount)).toThrowError(
            "Scroll amount must be a number"
          );
        });

        it("does not add a click event listener if scrollAmount is zero", () => {
          const direction = "right";
          const container = document.createElement("div");
          const scrollAmount = 0;
          const button = createScrollButton(direction, container, scrollAmount);
          expect(button.onclick).toBeNull();
        });

        it("creates a button with the correct text content for 'right' direction", () => {
          const direction = "right";
          const container = document.createElement("div");
          const scrollAmount = 100;
          const button = createScrollButton(direction, container, scrollAmount);
          expect(button.innerHTML).toBe("&gt;");
        });

        it("throws an error when no direction is provided", () => {
          const container = document.createElement("div");
          const scrollAmount = 100;
          expect(() => createScrollButton(undefined, container, scrollAmount)).toThrowError(
            "Invalid direction"
          );
        });

        it("throws an error when no container is provided", () => {
          const direction = "left";
          const scrollAmount = 100;
          expect(() => createScrollButton(direction, null, scrollAmount)).toThrowError(
            "Container must be an HTMLElement"
          );
        });
      });
    });

    it("throws an error when the scrollAmount is not a number", () => {
      const direction = "left";
      const container = document.createElement("div");
      const scrollAmount = "not a number";
      expect(() => createScrollButton(direction, container, scrollAmount)).toThrowError(
        "Scroll amount must be a number"
      );
    });
  });
});
