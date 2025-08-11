import { describe, it, expect, vi } from "vitest";

describe("timerService drift handling", () => {
  it("startTimer shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupBattleInfoBar.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 30
    }));
    let onDrift;
    const watchSpy = vi.fn((dur, cb) => {
      onDrift = cb;
      return vi.fn();
    });
    const startRound = vi.fn(async (onTick) => {
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startRound, watchForDrift: watchSpy };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    await mod.startTimer(async () => {});
    onDrift(2);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
  });

  it("scheduleNextRound shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupBattleInfoBar.js", () => ({
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
    const watchSpy = vi.fn((dur, cb) => {
      onDrift = cb;
      return vi.fn();
    });
    const startCoolDown = vi.fn((onTick) => {
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startCoolDown, watchForDrift: watchSpy };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const timer = vi.useFakeTimers();
    const btn = document.createElement("button");
    btn.id = "next-button";
    document.body.appendChild(btn);
    const timerNode = document.createElement("p");
    timerNode.id = "next-round-timer";
    document.body.appendChild(timerNode);
    mod.scheduleNextRound({ matchEnded: false });
    timer.advanceTimersByTime(2000);
    onDrift(1);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    timer.clearAllTimers();
  });

  it("clicking Next during cooldown skips current phase", async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    vi.doMock("../../../src/helpers/setupBattleInfoBar.js", () => ({
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
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      stopTimer: vi.fn(),
      STATS: []
    }));
    vi.doMock("../../../src/helpers/classicBattle/runTimerWithDrift.js", () => ({
      runTimerWithDrift: () => async () => {}
    }));
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.addEventListener("click", mod.onNextButtonClick);
    document.body.appendChild(btn);
    const timerNode = document.createElement("p");
    timerNode.id = "next-round-timer";
    document.body.appendChild(timerNode);
    mod.scheduleNextRound({ matchEnded: false });
    window.startRoundOverride = vi.fn();
    btn.click();
    await vi.waitFor(() => {
      expect(window.startRoundOverride).toHaveBeenCalled();
    });
    expect(btn.dataset.nextReady).toBeUndefined();
  });
});
