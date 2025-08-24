import { describe, it, expect, vi, beforeEach } from "vitest";

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

let scheduler;
vi.mock("../../src/helpers/battleEngineFacade.js", () => {
  let timerId;
  const makeTimer = (onTick, onExpired, duration) => {
    let remaining = duration;
    onTick(remaining);
    timerId = scheduler.setInterval(() => {
      remaining -= 1;
      onTick(remaining);
      if (remaining <= 0) {
        scheduler.clearInterval(timerId);
        onExpired();
      }
    }, 1000);
    return Promise.resolve();
  };
  return {
    startRound: makeTimer,
    startCoolDown: makeTimer,
    stopTimer: () => scheduler.clearInterval(timerId),
    STATS: ["a", "b"]
  };
});

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: () => {},
  showMessage: () => {},
  showAutoSelect: () => {},
  showTemporaryMessage: () => () => {}
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: () => {}
}));

vi.mock("../../src/helpers/testModeUtils.js", () => ({
  seededRandom: () => 0
}));

vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: (onSelect) => {
    const btn = document.querySelector('#stat-buttons button[data-stat="a"]');
    if (btn) btn.classList.add("selected");
    onSelect("a", { delayOpponentMessage: true });
    return Promise.resolve();
  }
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => Promise.resolve(2)
}));

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: () => Promise.resolve()
}));

describe("timerService", () => {
  beforeEach(() => {
    scheduler = createScheduler();
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("invokes skip handler registered after a pending skip", async () => {
    const mod = await import("../../src/helpers/classicBattle/skipHandler.js");
    const handler = vi.fn();
    mod.skipCurrentPhase();
    mod.setSkipHandler(handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("enables next round when skipped before cooldown starts", async () => {
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.classList.add("disabled");
    document.body.appendChild(btn);
    const timerEl = document.createElement("div");
    timerEl.id = "next-round-timer";
    document.body.appendChild(timerEl);

    const skip = await import("../../src/helpers/classicBattle/skipHandler.js");
    skip.skipCurrentPhase();

    const { scheduleNextRound } = await import("../../src/helpers/classicBattle/timerService.js");
    const promise = scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    await promise;

    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });

  it("auto-selects a stat after the round timer expires", async () => {
    const timerEl = document.createElement("div");
    timerEl.id = "next-round-timer";
    document.body.appendChild(timerEl);
    const statButtons = document.createElement("div");
    statButtons.id = "stat-buttons";
    const btnA = document.createElement("button");
    btnA.dataset.stat = "a";
    statButtons.appendChild(btnA);
    document.body.appendChild(statButtons);

    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    const onSelect = vi.fn();
    startTimer(onSelect);
    scheduler.tick(3000);
    await Promise.resolve();

    expect(onSelect).toHaveBeenCalledWith("a", { delayOpponentMessage: true });
  });
});
