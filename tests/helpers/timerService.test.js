import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("timerService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    const runSpy = vi.fn();
    vi.mock("../../src/helpers/classicBattle/runTimerWithDrift.js", () => ({
      runTimerWithDrift: vi.fn(() => runSpy)
    }));
    vi.mock("../../src/helpers/uiHelpers.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.mock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.mock("../../src/helpers/setupBattleInfoBar.js", () => ({
      clearTimer: vi.fn(),
      showMessage: vi.fn(),
      showAutoSelect: vi.fn(),
      showTemporaryMessage: () => () => {}
    }));
    vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      startRound: vi.fn(),
      stopTimer: vi.fn(),
      STATS: ["a", "b"]
    }));

    const mod = await import("../../src/helpers/classicBattle/timerService.js");
    mod.scheduleNextRound({ matchEnded: false });

    expect(btn.dataset.nextReady).toBe("true");
    expect(runSpy).not.toHaveBeenCalled();
  });

  it("auto-selects a stat after the round timer expires", async () => {
    const timerEl = document.createElement("div");
    timerEl.id = "next-round-timer";
    document.body.appendChild(timerEl);
    const statButtons = document.createElement("div");
    statButtons.id = "stat-buttons";
    const btnA = document.createElement("button");
    btnA.dataset.stat = "a";
    btnA.textContent = "A";
    statButtons.appendChild(btnA);
    document.body.appendChild(statButtons);

    vi.mock("../../src/helpers/classicBattle/runTimerWithDrift.js", () => ({
      runTimerWithDrift: vi.fn(() => async (_d, _t, onExpired) => {
        await onExpired();
      })
    }));
    vi.mock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.mock("../../src/helpers/setupBattleInfoBar.js", () => ({
      clearTimer: vi.fn(),
      showAutoSelect: vi.fn(),
      showMessage: vi.fn(),
      showTemporaryMessage: () => () => {}
    }));
    vi.mock("../../src/helpers/uiHelpers.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
      startRound: vi.fn(),
      startCoolDown: vi.fn(),
      stopTimer: vi.fn(),
      STATS: ["a", "b"]
    }));
    vi.mock("../../src/helpers/testModeUtils.js", () => ({
      seededRandom: () => 0
    }));
    vi.mock("../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: vi.fn(() => Promise.resolve(30))
    }));
    vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));

    const mod = await import("../../src/helpers/classicBattle/timerService.js");
    const onSelect = vi.fn();
    const promise = mod.startTimer(onSelect);
    await vi.runAllTimersAsync();
    await promise;

    expect(onSelect).toHaveBeenCalledWith("a", { delayOpponentMessage: true });
    expect(btnA.classList.contains("selected")).toBe(true);
  });
});
