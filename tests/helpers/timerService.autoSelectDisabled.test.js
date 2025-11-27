import { describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { showMessage, dispatchSpy, autoSelectSpy } = vi.hoisted(() => {
  const showMessageMock = vi.fn();
  const dispatchSpyMock = vi.fn();
  const autoSelectSpyMock = vi.fn();
  return {
    showMessage: showMessageMock,
    dispatchSpy: dispatchSpyMock,
    autoSelectSpy: autoSelectSpyMock
  };
});

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: () => {},
  showMessage,
  showAutoSelect: () => {},
  showTemporaryMessage: () => () => {},
  updateTimer: () => {},
  updateRoundCounter: () => {},
  clearRoundCounter: () => {}
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: () => {}
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => 1
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: () => false
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: () => {}
}));

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatchSpy
}));

vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: autoSelectSpy
}));

describe("timerService without auto-select", () => {
  it("dispatches timeout when autoSelect disabled", async () => {
    const timers = useCanonicalTimers();
    vi.resetModules();

    document.body.innerHTML =
      '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>';

    // All mocks now configured at module-level via vi.mock()
    // Skip the 8 vi.doMock() calls that were here

    const { mockCreateRoundTimer } = await import("./roundTimerMock.js");
    mockCreateRoundTimer({
      scheduled: false,
      ticks: [0],
      expire: true,
      moduleId: "../../src/helpers/timers/createRoundTimer.js"
    });

    const mod = await import("../../src/helpers/classicBattle/timerService.js");
    const { handleStatSelectionTimeout } = await import(
      "../../src/helpers/classicBattle/autoSelectHandlers.js"
    );
    const store = { selectionMade: false, autoSelectId: null };
    await mod.startTimer(async () => {}, store);
    handleStatSelectionTimeout(store, () => {}, 0);
    await vi.runAllTimersAsync();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("timeout");
    expect(showMessage).toHaveBeenCalledWith(
      "Stat selection stalled. Pick a stat or wait for auto-pick."
    );
    expect(autoSelectSpy).not.toHaveBeenCalled();
    timers.cleanup();
  });
});
