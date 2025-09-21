import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";

const showSnackbar = vi.fn();
const markOpponentPromptNow = vi.fn();
const scoreboardClearTimer = vi.fn();
const renderOpponentCard = vi.fn();
const showRoundOutcome = vi.fn();
const showStatComparison = vi.fn();
const updateDebugPanel = vi.fn();
const getOpponentCardData = vi.fn();

const delayState = { value: 500 };
const setOpponentDelayMock = vi.fn((ms) => {
  delayState.value = ms;
});
const getOpponentDelayMock = vi.fn(() => delayState.value);

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
  let setOpponentDelay;
  let bindUIHelperEventHandlersDynamic;
  let emitBattleEvent;
  let resetBattleEventTarget;

  beforeAll(async () => {
    ({ setOpponentDelay } = await import("../../src/helpers/classicBattle/snackbar.js"));
    ({ bindUIHelperEventHandlersDynamic } = await import(
      "../../src/helpers/classicBattle/uiEventHandlers.js"
    ));
    ({ emitBattleEvent, __resetBattleEventTarget: resetBattleEventTarget } = await import(
      "../../src/helpers/classicBattle/battleEvents.js"
    ));
  });

  beforeEach(() => {
    vi.useFakeTimers();
    delayState.value = 500;
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
    vi.stubGlobal("document", { getElementById: vi.fn(() => null) });
    resetBattleEventTarget?.();
    delete globalThis.__cbUIHelpersDynamicBoundTargets;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("emits opponent choosing snackbar after configured delay", () => {
    setOpponentDelay(120);
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
  });

  it("shows opponent choosing snackbar immediately when delay is not positive", () => {
    setOpponentDelay(0);
    bindUIHelperEventHandlersDynamic();

    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });

    expect(scoreboardClearTimer).toHaveBeenCalledTimes(1);
    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    expect(markOpponentPromptNow).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
