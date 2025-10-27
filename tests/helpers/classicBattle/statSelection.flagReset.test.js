import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { withMutedConsole } from "../../utils/console.js";
import { bindUIServiceEventHandlersOnce } from "../../../src/helpers/classicBattle/uiService.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  getOpponentDelay: vi.fn(() => 0),
  setOpponentDelay: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  startTimer: vi.fn(),
  stopTimer: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/autoSelectHandlers.js", () => ({
  handleStatSelectionTimeout: vi.fn()
}));

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  showMessage: vi.fn(),
  updateScore: vi.fn(),
  clearRoundCounter: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearMessage: vi.fn(),
  clearTimer: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
  handleStatSelection: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  getOpponentJudoka: vi.fn(() => ({ stats: {} }))
}));

vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  syncScoreDisplay: vi.fn(),
  updateDebugPanel: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn(() => 0)
}));

vi.mock("../../../src/helpers/classicBattle/opponentPromptTracker.js", () => ({
  getOpponentPromptTimestamp: vi.fn(() => 0)
}));

vi.mock("../../../src/helpers/classicBattle/opponentPromptWaiter.js", () => ({
  computeOpponentPromptWaitBudget: vi.fn(() => ({ bufferMs: 50, totalMs: 50 })),
  waitForDelayedOpponentPromptDisplay: vi.fn(async () => {}),
  DEFAULT_OPPONENT_PROMPT_BUFFER_MS: 250
}));

vi.mock("../../../src/helpers/utils/rafUtils.js", () => ({
  runAfterFrames: (frames, cb) => {
    if (typeof cb === "function") {
      cb();
    }
  }
}));

vi.mock("../../../src/helpers/classicBattle/idleCallback.js", () => ({
  runWhenIdle: (cb) => {
    if (typeof cb === "function") cb();
  }
}));

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn(async () => {}),
  isOrchestrated: () => false
}));

describe("classicBattle stat selection flag reset", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    document.body.innerHTML = "";
    document.body.removeAttribute("data-stat-selected");
  });

  afterEach(() => {
    timers.cleanup();
    vi.clearAllMocks();
  });

  it("clears body selection attribute after resolution and before next round", async () => {
    const { handleRoundResolvedEvent, applyRoundUI } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    const statButtonsHtml = `
      <div id="stat-buttons">
        <button data-stat="power" class="selected">Power</button>
      </div>
      <div id="round-result"></div>
      <div id="player-card"></div>
      <div id="opponent-card"></div>
    `;
    document.body.innerHTML = statButtonsHtml;
    const button = document.querySelector("#stat-buttons button[data-stat]");
    const store = {
      statButtonEls: { power: button },
      statTimeoutId: null,
      autoSelectId: null
    };

    document.body.setAttribute("data-stat-selected", "true");

    const result = {
      message: "Victory",
      playerScore: 1,
      opponentScore: 0,
      matchEnded: false
    };
    const event = new CustomEvent("roundResolved", { detail: { result, store } });

    await withMutedConsole(() =>
      handleRoundResolvedEvent(event, {
        scoreboard: {
          showMessage: vi.fn(),
          updateScore: vi.fn()
        },
        computeNextRoundCooldown: () => 3,
        createRoundTimer: () => ({ start: vi.fn(async () => {}) }),
        attachCooldownRenderer: vi.fn(),
        syncScoreDisplay: vi.fn(),
        updateDebugPanel: vi.fn()
      })
    );

    expect(document.body.hasAttribute("data-stat-selected")).toBe(false);

    // Simulate the next round starting and ensure the cleanup helper keeps the flag cleared.
    applyRoundUI(store, 2);

    expect(document.body.hasAttribute("data-stat-selected")).toBe(false);
    expect(button.classList.contains("selected")).toBe(false);
  });

  it("clears body selection attribute when roundReset event fires", async () => {
    const { bindUIServiceEventHandlersOnce } = await import(
      "../../../src/helpers/classicBattle/uiService.js"
    );
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");

    document.body.innerHTML = '<div class="modal" id="round-summary"></div>';
    const modal = document.getElementById("round-summary");
    modal.close = vi.fn();

    document.body.setAttribute("data-stat-selected", "true");
    bindUIServiceEventHandlersOnce();

    await withMutedConsole(async () => {
      emitBattleEvent("roundReset");
    });

    expect(document.body.hasAttribute("data-stat-selected")).toBe(false);
    // The round reset handler also closes the modal to return to stat selection UI.
    expect(modal.close).toHaveBeenCalled();
  });
});
