// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createSimpleHarness } from "../helpers/integrationHarness.js";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

const { mockIsEnabled } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn((flag) => flag === "opponentDelayMessage")
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: mockIsEnabled
}));

describe("Classic Battle opponent delay behavior", () => {
  let harness;
  let timers;
  let deps;
  let emitBattleEvent;
  let onBattleEvent;
  let resetEventTarget;
  let getOpponentPromptTimestamp;
  let renderOpponentCard;
  let placeholderId;
  let placeholderAriaLabel;
  let opponentCardAriaLabel;

  beforeEach(async () => {
    timers = useCanonicalTimers();
    harness = createSimpleHarness({ useFakeTimers: true, useRafMock: true });
    await harness.setup();

    document.body.innerHTML = `
      <main>
        <section id="battle-ui">
          <div id="round-message" role="status" aria-live="polite"></div>
          <div id="opponent-card" class="opponent-hidden"></div>
        </section>
      </main>
    `;

    window.__MIN_OPPONENT_MESSAGE_DURATION_MS = 300;

    const battleEvents = await harness.importModule(
      "../../src/helpers/classicBattle/battleEvents.js"
    );
    emitBattleEvent = battleEvents.emitBattleEvent;
    onBattleEvent = battleEvents.onBattleEvent;
    resetEventTarget = battleEvents.__resetBattleEventTarget;
    resetEventTarget?.();

    const promptTracker = await harness.importModule(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    const { resetOpponentPromptTimestamp, markOpponentPromptNow, recordOpponentPromptTimestamp } =
      promptTracker;
    getOpponentPromptTimestamp = promptTracker.getOpponentPromptTimestamp;
    resetOpponentPromptTimestamp();

    const snackbar = await harness.importModule("../../src/helpers/classicBattle/snackbar.js");
    snackbar.setOpponentDelay(300);

    const opponentPlaceholder = await harness.importModule(
      "../../src/helpers/classicBattle/opponentPlaceholder.js"
    );
    const {
      applyOpponentCardPlaceholder,
      OPPONENT_CARD_CONTAINER_ARIA_LABEL,
      OPPONENT_PLACEHOLDER_ARIA_LABEL,
      OPPONENT_PLACEHOLDER_ID
    } = opponentPlaceholder;
    placeholderId = OPPONENT_PLACEHOLDER_ID;
    placeholderAriaLabel = OPPONENT_PLACEHOLDER_ARIA_LABEL;
    opponentCardAriaLabel = OPPONENT_CARD_CONTAINER_ARIA_LABEL;

    const { showSnackbar } = await harness.importModule("../../src/helpers/showSnackbar.js");

    renderOpponentCard = vi.fn((card, container) => {
      container.dataset.cardName = card.name;
    });

    deps = {
      showSnackbar,
      t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key),
      markOpponentPromptNow,
      recordOpponentPromptTimestamp,
      getOpponentPromptMinDuration: promptTracker.getOpponentPromptMinDuration,
      isEnabled: mockIsEnabled,
      getOpponentDelay: snackbar.getOpponentDelay,
      scoreboard: { clearTimer: () => {} },
      getOpponentCardData: () => ({ name: "Shiai Rival" }),
      renderOpponentCard,
      showRoundOutcome: () => {},
      showStatComparison: () => {},
      updateDebugPanel: () => {},
      applyOpponentCardPlaceholder
    };

    const { bindUIHelperEventHandlersDynamic } = await harness.importModule(
      "../../src/helpers/classicBattle/uiEventHandlers.js"
    );

    bindUIHelperEventHandlersDynamic(deps);
  });

  afterEach(async () => {
    delete window.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    document.body.innerHTML = "";
    timers?.cleanup();
    await harness?.cleanup();
  });

  it("shows opponent prompt after round resolution while keeping the UI accessible", async () => {
    const promptEvents = [];
    const stopListening = onBattleEvent("opponentPromptReady", (evt) => {
      promptEvents.push(evt?.detail?.timestamp ?? null);
    });

    emitBattleEvent("opponentReveal");
    emitBattleEvent("round.evaluated", {
      message: "Result",
      statKey: "power",
      playerVal: 1,
      opponentVal: 2,
      scores: { player: 0, opponent: 0 },
      store: {}
    });
    await Promise.resolve();
    await Promise.resolve();
    // Immediately after statSelected event, snackbar should be visible
    let snackbarNode = document.querySelector("#snackbar-container .snackbar");
    expect(snackbarNode?.textContent).toBe("Opponent is choosing…");

    const opponentCard = document.getElementById("opponent-card");
    const placeholder = document.getElementById(placeholderId);
    expect(opponentCard?.classList.contains("opponent-hidden")).toBe(false);
    expect(opponentCard?.classList.contains("is-obscured")).toBe(true);
    expect(opponentCard?.getAttribute("aria-label") ?? opponentCardAriaLabel).toBe(
      opponentCardAriaLabel
    );
    expect(placeholder?.getAttribute("aria-label")).toBe(placeholderAriaLabel);

    expect(promptEvents).toHaveLength(1);

    const elapsed = promptEvents[0] ?? 0;
    expect(elapsed).toBeGreaterThan(0);
    expect(getOpponentPromptTimestamp()).toBeGreaterThan(0);

    stopListening?.();
  });

  it("renders opponent card once and removes placeholder after reveal timing completes", async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    try {
      emitBattleEvent("opponentReveal");
      emitBattleEvent("round.evaluated", {
        message: "Result",
        statKey: "power",
        playerVal: 1,
        opponentVal: 2,
        scores: { player: 0, opponent: 0 },
        store: {}
      });

      await timers.runAllTimersAsync();
      await Promise.resolve();

      const opponentCard = document.getElementById("opponent-card");
      const placeholder = document.getElementById(placeholderId);

      expect(renderOpponentCard).toHaveBeenCalledTimes(1);
      expect(renderOpponentCard).toHaveBeenCalledWith(
        { name: "Shiai Rival" },
        expect.objectContaining({ id: "opponent-card" })
      );
      expect(placeholder).toBeNull();
      expect(opponentCard?.classList.contains("is-obscured")).toBe(false);
      expect(opponentCard?.classList.contains("opponent-hidden")).toBe(false);
      expect(opponentCard?.getAttribute("aria-label")).toBe(opponentCardAriaLabel);
    } finally {
      requestAnimationFrameSpy.mockRestore();
    }
  });
});
