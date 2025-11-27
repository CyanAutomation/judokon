import { describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { dispatchSpy, autoSelectSpy } = vi.hoisted(() => {
  const dispatchSpyMock = vi.fn();
  const autoSelectSpyMock = vi.fn().mockResolvedValue(undefined);
  return { dispatchSpy: dispatchSpyMock, autoSelectSpy: autoSelectSpyMock };
});

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: () => {},
  showMessage: () => {},
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
  isEnabled: () => true
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

describe("timerService with auto-select", () => {
  it("auto-selects and dispatches timeout", async () => {
    const timers = useCanonicalTimers();
    vi.resetModules();

    document.body.innerHTML =
      '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>';

    // All mocks now configured at module-level via vi.mock()
    // Skip the 8 vi.doMock() calls that were here

    const { mockCreateRoundTimer } = await import("./roundTimerMock.js");
    // Immediate tick(0) then expire
    mockCreateRoundTimer({
      scheduled: false,
      ticks: [0],
      expire: true,
      moduleId: "../../src/helpers/timers/createRoundTimer.js"
    });

    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {}, { selectionMade: false });
    await vi.runAllTimersAsync();

    expect(autoSelectSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("timeout");
    timers.cleanup();
  });
});
