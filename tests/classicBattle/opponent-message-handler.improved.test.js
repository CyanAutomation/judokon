/**
 * @fileoverview Verifies opponent message UI handlers schedule or emit snackbar prompts
 * based on the configured delay, using mocked dependencies and fake timers to focus on
 * event wiring behavior rather than DOM integration.
 */

import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

const showSnackbar = vi.fn();
const markOpponentPromptNow = vi.fn();
const recordOpponentPromptTimestamp = vi.fn();
const getOpponentPromptMinDuration = vi.fn(() => 600);
const scoreboardClearTimer = vi.fn();
const renderOpponentCard = vi.fn();
const showRoundOutcome = vi.fn();
const showStatComparison = vi.fn();
const updateDebugPanel = vi.fn();
const getOpponentCardData = vi.fn();

vi.mock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: (flag) => flag === "opponentDelayMessage"
}));
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

describe("UI handlers: opponent message events", () => {
  let bindUIHelperEventHandlersDynamic;
  let emitBattleEvent;
  let resetBattleEventTarget;
  let setTimeoutSpy;
  let timers;
  let setOpponentDelay;

  beforeAll(async () => {
    // Import modules
    const snackbarModule = await import("../../src/helpers/classicBattle/snackbar.js");
    const uiEventHandlersModule = await import(
      "../../src/helpers/classicBattle/uiEventHandlers.js"
    );
    const battleEventsModule = await import("../../src/helpers/classicBattle/battleEvents.js");

    setOpponentDelay = snackbarModule.setOpponentDelay;
    bindUIHelperEventHandlersDynamic = uiEventHandlersModule.bindUIHelperEventHandlersDynamic;
    emitBattleEvent = battleEventsModule.emitBattleEvent;
    resetBattleEventTarget = battleEventsModule.__resetBattleEventTarget;
  });

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

    // Bind handlers
    console.log("[TEST] About to bind handlers");
    console.log(
      "[TEST] bindUIHelperEventHandlersDynamic type:",
      typeof bindUIHelperEventHandlersDynamic
    );
    try {
      bindUIHelperEventHandlersDynamic();
      console.log("[TEST] Handlers bound successfully");
    } catch (error) {
      console.log("[TEST] ERROR binding handlers:", error);
      throw error;
    }

    // DEBUG: Check if handlers are bound
    const eventTarget = globalThis.__classicBattleEventTarget;
    console.log("[TEST] eventTarget:", eventTarget);
    console.log("[TEST] eventTarget type:", eventTarget?.constructor?.name);
    console.log("[TEST] Has addEventListener?", typeof eventTarget?.addEventListener);

    // Try to manually listen to see if events work at all
    let manualListenerCalled = false;
    eventTarget.addEventListener("statSelected", () => {
      manualListenerCalled = true;
      console.log("[TEST] Manual listener called!");
    });

    // Emit event that triggers opponent message display
    console.log("[TEST] About to emit statSelected event");
    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });
    console.log("[TEST] Event emitted");
    console.log("[TEST] Manual listener was called?", manualListenerCalled);

    // Give any async callbacks a chance to run
    await timers.runAllTimersAsync();
    console.log("[TEST] Timers run");

    // DEBUG: Check what was called
    console.log("[TEST] showSnackbar calls:", showSnackbar.mock.calls);
    console.log("[TEST] markOpponentPromptNow calls:", markOpponentPromptNow.mock.calls);

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
    // Use the default delay of 500ms
    bindUIHelperEventHandlersDynamic();

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
