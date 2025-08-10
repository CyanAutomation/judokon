import { describe, it, expect, vi } from "vitest";

let showRandom;
let gameArea;
let carouselContainer;
let showCarousel;
let hideCard;

function setupDom() {
  showRandom = document.createElement("button");
  showRandom.id = "showRandom";
  gameArea = document.createElement("div");
  gameArea.id = "gameArea";
  carouselContainer = document.createElement("div");
  carouselContainer.id = "carousel-container";
  showCarousel = document.createElement("button");
  showCarousel.id = "showCarousel";
  hideCard = document.createElement("button");
  hideCard.id = "hideCard";
  document.body.append(showRandom, gameArea, carouselContainer, showCarousel, hideCard);
}

describe("game.js", () => {
  it("passes motion preference to generateRandomCard", async () => {
    setupDom();
    vi.resetModules();
    const generateRandomCard = vi.fn();
    const shouldReduceMotionSync = vi.fn(() => true);
    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ shouldReduceMotionSync }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings: vi.fn().mockResolvedValue({ featureFlags: {} })
    }));

    await import("../../src/game.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await Promise.resolve();
    showRandom.dispatchEvent(new Event("click"));

    expect(generateRandomCard).toHaveBeenCalledWith(null, null, gameArea, true, undefined, {
      enableInspector: false
    });
  });
});
