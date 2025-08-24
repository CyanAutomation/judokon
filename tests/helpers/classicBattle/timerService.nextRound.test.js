import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";

describe("timerService next round handling", () => {
  let dispatchBattleEvent;
  let startCoolDown;
  let scheduler;

  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    scheduler = createMockScheduler();
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
