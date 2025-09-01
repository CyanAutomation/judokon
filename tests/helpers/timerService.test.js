import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScheduler } from "./mockScheduler.js";
let scheduler;

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn(),
  showMessage: () => {},
  showAutoSelect: () => {},
  showTemporaryMessage: () => () => {},
  updateTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: () => {}
}));

vi.mock("../../src/helpers/testModeUtils.js", () => ({
  seededRandom: () => 0,
  isTestModeEnabled: () => false
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => Promise.resolve(2)
}));

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: () => Promise.resolve()
}));

describe("timerService", () => {
  beforeEach(() => {
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.resetModules();
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: vi.fn((onSelect) => {
        const btn = document.querySelector('#stat-buttons button[data-stat="a"]');
        if (btn) btn.classList.add("selected");
        onSelect("a", { delayOpponentMessage: true });
        return Promise.resolve();
      })
    }));
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => {
      const makeTimer = (onTick, onExpired, duration) => {
        onTick(duration);
        for (let i = 1; i <= duration; i++) {
          scheduler.setTimeout(() => {
            const remaining = duration - i;
            onTick(remaining);
            if (remaining <= 0) onExpired();
          }, i * 1000);
        }
      };
      return {
        startRound: makeTimer,
        startCoolDown: makeTimer,
        stopTimer: vi.fn(),
        STATS: ["a", "b"]
      };
    });
  });

  it("invokes skip handler registered after a pending skip", async () => {
    const mod = await import("../../src/helpers/classicBattle/skipHandler.js");
    const handler = vi.fn();
    mod.skipCurrentPhase();
    mod.setSkipHandler(handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("updates scoreboard timer and clears on expiration", async () => {
    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {}, { selectionMade: false });

    expect(scoreboard.updateTimer).toHaveBeenCalledWith(2);
    scheduler.tick(1000);
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(1);
    scheduler.tick(1000);
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(0);
    expect(scoreboard.clearTimer).toHaveBeenCalledTimes(1);
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
    const controls = scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    await controls.ready;

    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});
