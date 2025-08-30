import { describe, it, expect, vi } from "vitest";

describe("timerService without auto-select", () => {
  it("does not dispatch timeout when autoSelect disabled", async () => {
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
      isEnabled: () => false
    }));
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: () => {}
    }));

    const dispatchSpy = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/battleDispatcher.js", () => ({
      dispatchBattleEvent: dispatchSpy
    }));

    const autoSelectSpy = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: autoSelectSpy
    }));

    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => {
        const handlers = { tick: [], expired: [], drift: [] };
        return {
          on: (event, fn) => handlers[event]?.push(fn),
          start: () => {
            handlers.tick.forEach((fn) => fn(0));
            handlers.expired.forEach((fn) => fn());
          },
          stop: () => {}
        };
      }
    }));

    const mod = await import("../../src/helpers/classicBattle/timerService.js");
    await mod.startTimer(async () => {});

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(autoSelectSpy).not.toHaveBeenCalled();
  });
});
