/**
 * @fileoverview Verifies opponent message UI handlers schedule or emit snackbar prompts
 * based on the configured delay, using mocked dependencies and fake timers to focus on
 * event wiring behavior rather than DOM integration.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

// Hoist mock variables so they're available during module initialization
const { mockShow, mockRemove, mockWaitForMinDuration } = vi.hoisted(() => ({
  mockShow: vi.fn(),
  mockRemove: vi.fn(),
  mockWaitForMinDuration: vi.fn()
}));

// Mock SnackbarManager - the actual implementation uses this, not showSnackbar
vi.mock("../../src/helpers/SnackbarManager.js", () => ({
  default: {
    show: mockShow,
    remove: mockRemove
  },
  SnackbarPriority: {
    HIGH: 3,
    NORMAL: 2,
    LOW: 1
  }
}));

// Mock showSnackbar - kept for backward compatibility but not used by handler
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: (flag) => flag === "opponentDelayMessage"
}));

// Import the mocked showSnackbar AFTER vi.mock so we get the mocked version
import { showSnackbar, updateSnackbar } from "../../src/helpers/showSnackbar.js";

vi.mock("../../src/helpers/classicBattle/opponentPromptTracker.js", () => ({
  markOpponentPromptNow: vi.fn(),
  recordOpponentPromptTimestamp: vi.fn(),
  getOpponentPromptMinDuration: vi.fn(() => 600)
}));

// NOTE: We use the REAL snackbar module (not a mock) because the handler captures a reference to the
// imported functions at load time. To test different delay values, we call the real setOpponentDelay()
// function in beforeEach and in individual tests to control the module-level state.
// vi.mock("../../src/helpers/classicBattle/snackbar.js", ...)
vi.mock("../../src/helpers/classicBattle/opponentController.js", () => ({
  getOpponentCardData: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  renderOpponentCard: vi.fn(),
  showRoundOutcome: vi.fn(),
  showStatComparison: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn()
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

// Import mocked modules to access their mock functions
import { getOpponentCardData } from "../../src/helpers/classicBattle/opponentController.js";
import {
  markOpponentPromptNow,
  recordOpponentPromptTimestamp,
  getOpponentPromptMinDuration
} from "../../src/helpers/classicBattle/opponentPromptTracker.js";
import {
  renderOpponentCard,
  showRoundOutcome,
  showStatComparison
} from "../../src/helpers/classicBattle/uiHelpers.js";
import { updateDebugPanel } from "../../src/helpers/classicBattle/debugPanel.js";
import { clearTimer as scoreboardClearTimer } from "../../src/helpers/setupScoreboard.js";

describe("UI handlers: opponent message events", () => {
  let setTimeoutSpy;
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    // Reset SnackbarManager mocks
    mockShow.mockReset();
    mockShow.mockImplementation((config) => {
      // Call onShow callback if provided
      if (config && typeof config.onShow === "function") {
        config.onShow();
      }
      return {
        remove: mockRemove,
        waitForMinDuration: mockWaitForMinDuration
      };
    });
    mockRemove.mockReset().mockResolvedValue();
    mockWaitForMinDuration.mockReset().mockResolvedValue();
    
    showSnackbar.mockReset();
    updateSnackbar.mockReset();
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
      updateSnackbar,
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
    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: false } });

    // Give any async callbacks a chance to run
    await timers.runAllTimersAsync();

    // When delay is 0 or less, snackbar should show immediately without setTimeout
    // Implementation uses snackbarManager.show() with HIGH priority
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Opponent is choosing…",
        priority: 3, // SnackbarPriority.HIGH
        minDuration: 750,
        autoDismiss: 0
      })
    );
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(markOpponentPromptNow).toHaveBeenCalledWith({ notify: true });
    expect(recordOpponentPromptTimestamp).not.toHaveBeenCalled();
    // No timers should be queued when delay is 0
    expect(vi.getTimerCount()).toBe(0);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it("defers opponent choosing snackbar until after delay when flag enabled (QA spec)", async () => {
    // Create dependencies object with mocked functions
    const deps = {
      showSnackbar,
      updateSnackbar,
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

    // Per QA spec: When delay > 0 and flag enabled, snackbar should NOT appear immediately
    expect(mockShow).not.toHaveBeenCalled();
    expect(markOpponentPromptNow).not.toHaveBeenCalled();

    // Timer should be scheduled for the delay period
    expect(vi.getTimerCount()).toBe(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    // Delay uses the configured opponent delay (500ms)
    expect(setTimeoutSpy.mock.calls[0][1]).toBe(500);

    // After timer fires, the snackbar should appear and prompt timestamp recorded
    await timers.runAllTimersAsync();

    // Per QA spec: Snackbar appears AFTER delay
    // Implementation uses snackbarManager.show() with HIGH priority and minDuration
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Opponent is choosing…",
        priority: 3, // SnackbarPriority.HIGH
        minDuration: 600, // Uses getOpponentPromptMinDuration()
        autoDismiss: 0
      })
    );
    expect(mockShow).toHaveBeenCalledTimes(1);
    // markOpponentPromptNow is called with notify: true after delay (timer callback, via onShow)
    expect(markOpponentPromptNow).toHaveBeenCalledWith({ notify: true });
    expect(markOpponentPromptNow).toHaveBeenCalledTimes(1);
  });
});
