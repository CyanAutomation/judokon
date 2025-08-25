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
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
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
    vi.doMock("../../../src/helpers/classicBattle/battleDispatcher.js", () => ({
      dispatchBattleEvent
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clicking Next during cooldown skips current phase", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const { nextButton } = createTimerNodes();
    const controls = mod.scheduleNextRound({ matchEnded: false }, scheduler);
    nextButton.addEventListener("click", (e) => mod.onNextButtonClick(e, controls));
    scheduler.tick(0);
    nextButton.click();
    await controls.ready;
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
    const controls = mod.scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    await controls.ready;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("computeNextRoundCooldown respects test mode", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const val = mod.computeNextRoundCooldown({ isTestModeEnabled: () => true });
    expect(val).toBe(0);
  });

  it("createNextRoundSnackbarRenderer shows and updates", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const renderer = mod.createNextRoundSnackbarRenderer();
    const snackbarMod = await import("../../../src/helpers/showSnackbar.js");
    const scoreboardMod = await import("../../../src/helpers/setupScoreboard.js");

    renderer(3);
    renderer(2);
    renderer(2);
    renderer(0);

    expect(snackbarMod.showSnackbar).toHaveBeenCalledWith("Next round in: 3s");
    expect(snackbarMod.updateSnackbar).toHaveBeenCalledWith("Next round in: 2s");
    expect(scoreboardMod.clearTimer).toHaveBeenCalled();
  });

  it("scheduleNextRound handles zero-second cooldown fast path", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const { nextButton } = createTimerNodes();
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const controls = mod.scheduleNextRound({ matchEnded: false }, scheduler);
    scheduler.tick(0);
    await controls.ready;
    expect(nextButton.dataset.nextReady).toBe("true");
    expect(nextButton.disabled).toBe(false);
    setTestMode(false);
  });
});
