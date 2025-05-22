import { vi } from "vitest";
import { getFlagUrl } from "../helpers/countryUtils.js";
import { generateCardTopBar } from "../helpers/cardTopBar.js";
import {
  generateCardPortrait,
  generateCardStats,
  generateCardSignatureMove
} from "../helpers/cardRender.js";
import { generateJudokaCardHTML } from "../helpers/cardBuilder.js";
import { createScrollButton } from "../helpers/carouselBuilder.js";

// Mock fetch globally
vi.stubGlobal("fetch", (url) => {
  if (url.endsWith("countryCodeMapping.json")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          { country: "United States", code: "US", active: true },
          { country: "France", code: "FR", active: true }
        ])
    });
  }
  return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
});

describe("cardBuilder.js", () => {
  describe("getFlagUrl", () => {
    it("returns a valid flag URL for a given country code", async () => {
      const countryCode = "us";
      const expectedUrl = "https://flagcdn.com/w320/us.png";
      const result = await getFlagUrl(countryCode);
      expect(result).toBe(expectedUrl);
    });

    it("returns an empty string for an invalid country code", async () => {
      const countryCode = "invalid";
      const result = await getFlagUrl(countryCode);
      expect(result).toBe("");
    });
  });

  describe("generateCardPortrait", () => {
    it("returns a valid HTML string for a judoka's portrait", () => {
      const judoka = { id: 0, firstname: "John", surname: "Doe" };
      const expectedHtml = `<div class='card-portrait'><img src='../assets/judokaPortraits/judokaPortrait-0.png' alt='John Doe's portrait' onerror="this.src='../assets/judokaPortraits/judokaPortrait-0.png'"></div>`;
      expect(generateCardPortrait(judoka)).toContain(expectedHtml);
    });
  });

  describe("generateCardStats", () => {
    it("returns a valid HTML string for a judoka's stats", () => {
      const card = {
        stats: {
          power: 9,
          speed: 6,
          technique: 7,
          kumikata: 7,
          newaza: 8
        }
      };

      const expectedHtml =
        "<ul>" +
        "<li class='stat'><strong>POWER</strong> <span>9</span></li>" +
        "<li class='stat'><strong>SPEED</strong> <span>6</span></li>" +
        "<li class='stat'><strong>TECHNIQUE</strong> <span>7</span></li>" +
        "<li class='stat'><strong>KUMI-KATA</strong> <span>7</span></li>" +
        "<li class='stat'><strong>NE-WAZA</strong> <span>8</span></li>" +
        "</ul>";

      const result = generateCardStats(card);
      expect(result).toContain(expectedHtml);
    });
  });

  describe("createScrollButton", () => {
    it("creates a scroll button with the correct class and inner HTML", () => {
      const direction = "left";
      const container = document.createElement("div");
      const scrollAmount = 100;
      const button = createScrollButton(direction, container, scrollAmount);
      expect(button.className).toBe("scroll-button left");
      expect(button.innerHTML).toBe("&lt;");
    });

    it("throws an error when the direction is not 'left' or 'right'", () => {
      const direction = "up";
      const container = document.createElement("div");
      const scrollAmount = 100;
      expect(() => createScrollButton(direction, container, scrollAmount)).toThrowError(
        "Invalid direction"
      );
    });
  });
});
