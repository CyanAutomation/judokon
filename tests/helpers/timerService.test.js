import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/helpers/battleEngineFacade.js", () => {
  let timerId;
  const makeTimer = (onTick, onExpired, duration) => {
    let remaining = duration;
    onTick(remaining);
    timerId = setInterval(() => {
      remaining -= 1;
      onTick(remaining);
      if (remaining <= 0) {
        clearInterval(timerId);
        onExpired();
      }
    }, 1000);
  };
  return {
    startRound: makeTimer,
    startCoolDown: makeTimer,
    stopTimer: () => clearInterval(timerId),
    watchForDrift: () => () => {},
    STATS: ["a", "b"]
  };
});

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/setupBattleInfoBar.js", () => ({
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

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => Promise.resolve(2)
}));

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: () => Promise.resolve()
}));

describe("timerService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    scheduleNextRound({ matchEnded: false });
    await vi.runAllTimersAsync();

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
    const promise = startTimer(onSelect);
    await vi.runAllTimersAsync();
    await promise;

    expect(btnA.classList.contains("selected")).toBe(true);
    expect(onSelect).toHaveBeenCalledWith("a", { delayOpponentMessage: true });
  });
});
