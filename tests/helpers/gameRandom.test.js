import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    setupDom();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("hides the random card button and renders a card when clicked", async () => {
    const placeholder = document.createElement("p");
    placeholder.dataset.testid = "placeholder";
    placeholder.textContent = "Existing content";
    gameArea.appendChild(placeholder);

    const generatedCardText = "Champion of the Tatami";

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard: vi.fn(async (_activeCards, _gokyoData, container) => {
        if (!container) return;
        const card = document.createElement("article");
        card.className = "judoka-card";
        card.textContent = generatedCardText;
        container.appendChild(card);
      })
    }));

    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      shouldReduceMotionSync: vi.fn(() => false)
    }));

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: {} }),
      isEnabled: vi.fn(() => false),
      featureFlagsEmitter: new EventTarget()
    }));

    vi.doMock("../../src/helpers/cardUtils.js", () => ({
      toggleInspectorPanels: vi.fn()
    }));

    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn()
    }));

    const { initGame } = await import("../../src/game.js");
    await initGame();

    showRandom.dispatchEvent(new Event("click"));
    await Promise.resolve();

    expect(showRandom.classList.contains("hidden")).toBe(true);
    expect(gameArea.querySelector('[data-testid="placeholder"]')).toBeNull();

    const renderedCard = gameArea.querySelector(".judoka-card");
    expect(renderedCard).not.toBeNull();
    expect(renderedCard.textContent).toContain(generatedCardText);
  });
});
