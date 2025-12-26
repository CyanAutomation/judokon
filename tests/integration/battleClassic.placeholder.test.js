import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { init } from "../../src/pages/battleClassic.init.js";
import {
  emitBattleEvent,
  __resetBattleEventTarget
} from "../../src/helpers/classicBattle/battleEvents.js";
import {
  OPPONENT_CARD_CONTAINER_ARIA_LABEL,
  OPPONENT_PLACEHOLDER_ARIA_LABEL
} from "../../src/helpers/classicBattle/opponentPlaceholder.js";
import { bindUIHelperEventHandlersDynamic } from "../../src/helpers/classicBattle/uiEventHandlers.js";
import { getRoundResolvedPromise } from "../../src/helpers/classicBattle/promises.js";
import { createRealHtmlTestEnvironment } from "../utils/realHtmlTestUtils.js";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

/**
 * @fileoverview Integration tests validating the Battle Classic opponent placeholder lifecycle.
 * @testsetup Uses the real battle init flow with JSDOM to verify placeholder accessibility and replacement logic.
 */
describe("Battle Classic opponent placeholder integration", () => {
  let cleanup;

  beforeEach(() => {
    const env = createRealHtmlTestEnvironment();
    cleanup = env.cleanup;
    global.window = env.window;
    global.document = env.document;
    global.navigator = env.window.navigator;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    env.window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    cleanup?.();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("renders an accessible opponent placeholder card before any reveal", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();
    expect(opponentCard?.classList.contains("opponent-hidden")).toBe(false);

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains("card")).toBe(true);
    expect(placeholder.getAttribute("aria-label")).toBe(OPPONENT_PLACEHOLDER_ARIA_LABEL);
  });

  it("replaces the placeholder with the revealed opponent card after the first stat resolution", async () => {
    useCanonicalTimers();
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

    const renderOpponentCard = vi.fn(async (cardData, container) => {
      const cardContainer = container.ownerDocument.createElement("div");
      cardContainer.className = "card-container";
      const card = container.ownerDocument.createElement("div");
      card.className = "judoka-card";
      card.setAttribute("aria-label", `Opponent: ${cardData.name}`);
      cardContainer.appendChild(card);
      container.appendChild(cardContainer);
    });

    const getOpponentCardData = vi.fn(async () => ({ name: "Test Fighter" }));

    __resetBattleEventTarget();
    bindUIHelperEventHandlersDynamic({ renderOpponentCard, getOpponentCardData });

    const resolved = getRoundResolvedPromise();
    emitBattleEvent("opponentReveal");
    const placeholder = opponentCard?.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.getAttribute("aria-label")).toBe(OPPONENT_PLACEHOLDER_ARIA_LABEL);
    expect(opponentCard?.classList.contains("is-obscured")).toBe(true);

    emitBattleEvent("roundResolved", { store: {}, result: { message: "" } });
    await resolved;
    await vi.runAllTimersAsync();

    expect(renderOpponentCard).toHaveBeenCalled();
    expect(getOpponentCardData).toHaveBeenCalled();
    expect(opponentCard?.classList.contains("is-obscured")).toBe(false);
    expect(opponentCard?.querySelector("#mystery-card-placeholder")).toBeNull();

    const revealedContainer = opponentCard?.querySelector(".card-container");
    expect(revealedContainer).not.toBeNull();
    const currentCard = revealedContainer?.querySelector(".judoka-card");
    expect(currentCard).not.toBeNull();
    expect(currentCard?.getAttribute("aria-label")).toBe("Opponent: Test Fighter");
    expect(opponentCard?.getAttribute("aria-label")).toBe(OPPONENT_CARD_CONTAINER_ARIA_LABEL);
  });
});
