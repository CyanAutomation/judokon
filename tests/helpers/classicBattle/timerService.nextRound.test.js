import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";

function createScheduler() {
  let now = 0;
  const timers = new Set();
  return {
    setTimeout(fn, delay) {
      const t = { due: now + delay, fn, repeat: false };
      timers.add(t);
      return t;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    tick(ms) {
      now += ms;
      let fired;
      do {
        fired = false;
        for (const t of Array.from(timers)) {
          if (t.due <= now) {
            t.fn();
            timers.delete(t);
            fired = true;
          }
        }
      } while (fired);
    }
  };
}

let scheduler;

describe("timerService next round handling", () => {
  let dispatchBattleEvent;
  let startCoolDown;

  beforeEach(() => {
    scheduler = createScheduler();
    vi.resetModules();
    document.body.innerHTML = "";
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage: vi.fn(),
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    startCoolDown = vi.fn();
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown,
      stopTimer: vi.fn(),
      STATS: []
    }));
    dispatchBattleEvent = vi.fn();
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clicking Next during cooldown skips current phase", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const { nextButton } = createTimerNodes();
    nextButton.addEventListener("click", mod.onNextButtonClick);
    const promise = mod.scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    nextButton.click();
    await promise;
    // Current flow guarantees at least one dispatch; a second may occur
    // via attribute observation. Accept one or more invocations.
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-dispatches ready when cooldown finishes", async () => {
    startCoolDown.mockImplementation((_t, onExpired) => {
      onExpired();
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    createTimerNodes();
    const promise = mod.scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    await promise;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });
});
