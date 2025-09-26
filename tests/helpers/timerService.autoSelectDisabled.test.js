import { describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

describe("timerService without auto-select", () => {
  it("dispatches timeout when autoSelect disabled", async () => {
    const timers = useCanonicalTimers();
    vi.resetModules();

    document.body.innerHTML =
      '<div id="next-round-timer"></div><div id="stat-buttons"><button data-stat="a"></button></div>';

    const showMessage = vi.fn();
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: () => {},
      showMessage,
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: () => {},
      updateRoundCounter: () => {},
      clearRoundCounter: () => {}
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
      isEnabled: () => false
    }));
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: () => {}
    }));

    const dispatchSpy = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: dispatchSpy
    }));

    const autoSelectSpy = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: autoSelectSpy
    }));

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
