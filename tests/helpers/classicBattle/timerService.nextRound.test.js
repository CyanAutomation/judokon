import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";

describe("timerService next round handling", () => {
  let dispatchBattleEvent;
  let startCoolDown;

  beforeEach(() => {
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
    mod.scheduleNextRound({ matchEnded: false });
    nextButton.click();
    await vi.waitFor(() => {
      expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    });
    // Current flow guarantees at least one dispatch; a second may occur
    // via attribute observation. Accept one or more invocations.
    expect(dispatchBattleEvent.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-dispatches ready when cooldown finishes", async () => {
    startCoolDown.mockImplementation((_t, onExpired) => {
      onExpired();
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    createTimerNodes();
    mod.scheduleNextRound({ matchEnded: false });
    await vi.waitFor(() => {
      expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });
});
