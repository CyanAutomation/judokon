import { describe, it, expect, vi } from "vitest";

describe("timerService with auto-select", () => {
  it("auto-selects and dispatches timeout", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    document.body.innerHTML =
      '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>';

    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: () => {},
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: () => {}
    }));
    vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateDebugPanel: () => {}
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: () => {},
      updateSnackbar: () => {}
    }));

    vi.doMock("../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 1
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      isEnabled: () => true
    }));
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: () => {}
    }));

    const dispatchSpy = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: dispatchSpy
    }));

    const autoSelectSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: autoSelectSpy
    }));

    const { mockCreateRoundTimer } = await import("./roundTimerMock.js");
    // Immediate tick(0) then expire
    mockCreateRoundTimer({ scheduled: false, ticks: [0], expire: true, moduleId: "../../src/helpers/timers/createRoundTimer.js" });

    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {}, { selectionMade: false });
    await vi.runAllTimersAsync();

    expect(autoSelectSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("timeout");
  });
});
