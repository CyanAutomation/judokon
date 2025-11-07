/**
 * @fileoverview Verifies opponent message UI handlers schedule or emit snackbar prompts
 * based on the configured delay, using mocked dependencies and fake timers to focus on
 * event wiring behavior rather than DOM integration.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

// Create mock functions that will be used by vi.mock factories
const markOpponentPromptNow = vi.fn();
const recordOpponentPromptTimestamp = vi.fn();
const getOpponentPromptMinDuration = vi.fn(() => 600);
const scoreboardClearTimer = vi.fn();
const renderOpponentCard = vi.fn();
const showRoundOutcome = vi.fn();
const showStatComparison = vi.fn();
const updateDebugPanel = vi.fn();
const getOpponentCardData = vi.fn();

// Mock showSnackbar - Vitest will create a fresh mock for each import
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: (flag) => flag === "opponentDelayMessage"
}));

// Import the mocked showSnackbar AFTER vi.mock so we get the mocked version
import { showSnackbar } from "../../src/helpers/showSnackbar.js";
vi.mock("../../src/helpers/classicBattle/opponentPromptTracker.js", () => ({
  markOpponentPromptNow,
  recordOpponentPromptTimestamp,
  getOpponentPromptMinDuration
}));

// NOTE: We use the REAL snackbar module (not a mock) because the handler captures a reference to the
// imported functions at load time. To test different delay values, we call the real setOpponentDelay()
// function in beforeEach and in individual tests to control the module-level state.
// vi.mock("../../src/helpers/classicBattle/snackbar.js", ...)
vi.mock("../../src/helpers/classicBattle/opponentController.js", () => ({
  getOpponentCardData
}));
vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  renderOpponentCard,
  showRoundOutcome,
  showStatComparison
}));
vi.mock("../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel
}));
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: scoreboardClearTimer
}));
vi.mock("../../src/helpers/i18n.js", () => ({
  t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key)
}));
vi.mock("../../src/helpers/classicBattle/opponentPlaceholder.js", () => ({
  applyOpponentCardPlaceholder: vi.fn(),
  OPPONENT_CARD_CONTAINER_ARIA_LABEL: "Opponent card",
  OPPONENT_PLACEHOLDER_ARIA_LABEL: "Mystery opponent card",
  OPPONENT_PLACEHOLDER_ID: "mystery-card-placeholder"
}));

// Static imports - these must come AFTER vi.mock() declarations
import { setOpponentDelay } from "../../src/helpers/classicBattle/snackbar.js";
import { bindUIHelperEventHandlersDynamic } from "../../src/helpers/classicBattle/uiEventHandlers.js";
import {
  emitBattleEvent,
  __resetBattleEventTarget as resetBattleEventTarget
} from "../../src/helpers/classicBattle/battleEvents.js";

describe("UI handlers: opponent message events", () => {
  let setTimeoutSpy;
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    showSnackbar.mockReset();
    markOpponentPromptNow.mockReset();
    markOpponentPromptNow.mockImplementation(() => 123.45);
    recordOpponentPromptTimestamp.mockReset();
    getOpponentPromptMinDuration.mockReset();
    getOpponentPromptMinDuration.mockReturnValue(600);
    scoreboardClearTimer.mockReset();
    renderOpponentCard.mockReset();
    showRoundOutcome.mockReset();
    showStatComparison.mockReset();
    updateDebugPanel.mockReset();
    getOpponentCardData.mockReset();
    vi.stubGlobal("document", { getElementById: vi.fn(() => null) });
    delete globalThis.__cbUIHelpersDynamicBoundTargets;

    // Reset opponent delay to default
    setOpponentDelay(500);

    resetBattleEventTarget?.();
  });

  afterEach(() => {
    vi.clearAllTimers();
    timers.cleanup();
    vi.unstubAllGlobals();
    setTimeoutSpy?.mockRestore();
  });

  it("shows opponent choosing snackbar immediately when delay is not positive", async () => {
    // Set delay to 0 to test immediate display
    setOpponentDelay(0);

    // Create dependencies object with mocked functions
    const deps = {
      showSnackbar,
      t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key),
      markOpponentPromptNow,
      recordOpponentPromptTimestamp,
      getOpponentPromptMinDuration,
      isEnabled: (flag) => flag === "opponentDelayMessage",
      getOpponentDelay: () => 0,
      scoreboard: { clearTimer: scoreboardClearTimer },
      getOpponentCardData,
      renderOpponentCard,
      showRoundOutcome,
      showStatComparison,
      updateDebugPanel,
      applyOpponentCardPlaceholder: vi.fn()
    };

    // Bind handlers with mocked dependencies
    bindUIHelperEventHandlersDynamic(deps);

    // Emit event that triggers opponent message display
    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });

    // Give any async callbacks a chance to run
    await timers.runAllTimersAsync();

    // When delay is 0 or less, snackbar should show immediately without setTimeout
    // Only markOpponentPromptNow should have been called, not recordOpponentPromptTimestamp
    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    expect(markOpponentPromptNow).toHaveBeenCalledWith({ notify: true });
    expect(recordOpponentPromptTimestamp).not.toHaveBeenCalled();
    // No timers should be queued when delay is 0
    expect(vi.getTimerCount()).toBe(0);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it("reuses captured timestamp when notifying after enforced delay", () => {
    // Create dependencies object with mocked functions
    const deps = {
      showSnackbar,
      t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key),
      markOpponentPromptNow,
      recordOpponentPromptTimestamp,
      getOpponentPromptMinDuration,
      isEnabled: (flag) => flag === "opponentDelayMessage",
      getOpponentDelay: () => 500,
      scoreboard: { clearTimer: scoreboardClearTimer },
      getOpponentCardData,
      renderOpponentCard,
      showRoundOutcome,
      showStatComparison,
      updateDebugPanel,
      applyOpponentCardPlaceholder: vi.fn()
    };

    // Use the default delay of 500ms
    bindUIHelperEventHandlersDynamic(deps);

    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });

    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    expect(markOpponentPromptNow).toHaveBeenCalledWith({ notify: false });
    expect(recordOpponentPromptTimestamp).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy.mock.calls[0][1]).toBe(600);

    vi.runOnlyPendingTimers();

    expect(recordOpponentPromptTimestamp).toHaveBeenCalledTimes(1);
    expect(recordOpponentPromptTimestamp).toHaveBeenCalledWith(123.45);
    expect(markOpponentPromptNow).toHaveBeenCalledTimes(1);
  });
});
