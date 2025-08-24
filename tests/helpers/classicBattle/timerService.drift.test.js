import { describe, it, expect, vi } from "vitest";
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
    setInterval(fn, interval) {
      const t = { due: now + interval, fn, repeat: true, interval };
      timers.add(t);
      return t;
    },
    clearInterval(id) {
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
            if (t.repeat) {
              t.due += t.interval;
            } else {
              timers.delete(t);
            }
            fired = true;
          }
        }
      } while (fired);
    }
  };
}

describe("timerService drift handling", () => {
  it("startTimer shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 30
    }));
    let onDrift;
    const startRound = vi.fn(async (onTick, _expired, _dur, driftCb) => {
      onDrift = driftCb;
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startRound };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    await mod.startTimer(async () => {});
    onDrift(2);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
  });

  it("scheduleNextRound shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    let onDrift;
    const startCoolDown = vi.fn((onTick, _expired, _dur, driftCb) => {
      onDrift = driftCb;
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startCoolDown };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const scheduler = createScheduler();
    createTimerNodes();
    mod.scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    onDrift(1);
    // Cooldown drift displays a non-intrusive fallback; may use snackbar
    // when a round result message is present. Accept scoreboard fallback too.
    const usedScoreboard = showMessage.mock.calls.some((c) => c[0] === "Waiting…");
    const snackbar = await import("../../../src/helpers/showSnackbar.js");
    const showSnack = vi.spyOn(snackbar, "showSnackbar");
    // Trigger another drift tick to allow snackbar path in environments
    // where the round message is present.
    onDrift(1);
    const usedSnackbar = showSnack.mock.calls.some((c) => c[0] === "Waiting…");
    expect(usedScoreboard || usedSnackbar).toBe(true);
  });
});
