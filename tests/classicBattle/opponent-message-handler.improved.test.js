/**
 * @fileoverview Verifies opponent message UI handlers schedule or emit snackbar prompts
 * based on the configured delay, using mocked dependencies and fake timers to focus on
 * event wiring behavior rather than DOM integration.
 */

import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";

const showSnackbar = vi.fn();
const markOpponentPromptNow = vi.fn();
const scoreboardClearTimer = vi.fn();
const renderOpponentCard = vi.fn();
const showRoundOutcome = vi.fn();
const showStatComparison = vi.fn();
const updateDebugPanel = vi.fn();
const getOpponentCardData = vi.fn();

const setOpponentDelayMock = vi.fn();
const getOpponentDelayMock = vi.fn(() => 500);

vi.mock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));
vi.mock("../../src/helpers/classicBattle/opponentPromptTracker.js", () => ({
  markOpponentPromptNow
}));
vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  setOpponentDelay: setOpponentDelayMock,
  getOpponentDelay: getOpponentDelayMock
}));
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

describe("UI handlers: opponent message events", () => {
  let bindUIHelperEventHandlersDynamic;
  let emitBattleEvent;
  let resetBattleEventTarget;
  let setTimeoutSpy;

  beforeAll(async () => {
    const snackbarModule = await import("../../src/helpers/classicBattle/snackbar.js");
    const uiEventHandlersModule = await import(
      "../../src/helpers/classicBattle/uiEventHandlers.js"
    );
    const battleEventsModule = await import("../../src/helpers/classicBattle/battleEvents.js");

    bindUIHelperEventHandlersDynamic = uiEventHandlersModule.bindUIHelperEventHandlersDynamic;
    emitBattleEvent = battleEventsModule.emitBattleEvent;
    resetBattleEventTarget = battleEventsModule.__resetBattleEventTarget;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    showSnackbar.mockReset();
    markOpponentPromptNow.mockReset();
    scoreboardClearTimer.mockReset();
    renderOpponentCard.mockReset();
    showRoundOutcome.mockReset();
    showStatComparison.mockReset();
    updateDebugPanel.mockReset();
    getOpponentCardData.mockReset();
    setOpponentDelayMock.mockClear();
    getOpponentDelayMock.mockClear();
    getOpponentDelayMock.mockReturnValue(500);
    vi.stubGlobal("document", { getElementById: vi.fn(() => null) });
    resetBattleEventTarget?.();
    delete globalThis.__cbUIHelpersDynamicBoundTargets;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setTimeoutSpy?.mockRestore();
  });

  it("emits opponent choosing snackbar after configured delay", () => {
    getOpponentDelayMock.mockReturnValue(120);
    bindUIHelperEventHandlersDynamic();

    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });

    expect(scoreboardClearTimer).toHaveBeenCalledTimes(1);
    expect(showSnackbar).not.toHaveBeenCalled();
    expect(markOpponentPromptNow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(119);
    expect(showSnackbar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    expect(markOpponentPromptNow).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("shows opponent choosing snackbar immediately when delay is not positive", () => {
    getOpponentDelayMock.mockReturnValue(0);
    bindUIHelperEventHandlersDynamic();

    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });

    expect(scoreboardClearTimer).toHaveBeenCalledTimes(1);
    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    expect(markOpponentPromptNow).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});
