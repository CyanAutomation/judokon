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
      clearTimer: vi.fn(),
      updateTimer: vi.fn()
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
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clicking Next during cooldown skips current phase", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { nextButton } = createTimerNodes();
    const controls = roundMod.startCooldown({}, scheduler);
    nextButton.addEventListener("click", (e) => timerMod.onNextButtonClick(e, controls));
    scheduler.tick(100);
    nextButton.click();
    await controls.ready;
    // Current flow guarantees at least one dispatch; a second may occur
    // via attribute observation. Accept one or more invocations.
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-dispatches ready after 1s cooldown", async () => {
    startCoolDown.mockImplementation((_t, onExpired) => {
      onExpired();
    });
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    createTimerNodes();
    const controls = roundMod.startCooldown({}, scheduler);
    scheduler.tick(1100);
    await controls.ready;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("clears stale nextReady before starting a new cooldown", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { nextButton } = createTimerNodes();
    nextButton.dataset.nextReady = "true";
    nextButton.disabled = false;
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;
    const controls = roundMod.startCooldown({}, scheduler);
    expect(nextButton.dataset.nextReady).toBeUndefined();
    expect(nextButton.disabled).toBe(false);
    scheduler.tick(1100);
    await controls.ready;
    expect(nextButton.dataset.nextReady).toBe("true");
    delete window.__NEXT_ROUND_COOLDOWN_MS;
  });

  it("computeNextRoundCooldown respects test mode", async () => {
    const mod = await import("../../../src/helpers/timers/computeNextRoundCooldown.js");
    const val = mod.computeNextRoundCooldown({ isTestModeEnabled: () => true });
    expect(val).toBe(1);
  });

  it("CooldownRenderer shows and updates", async () => {
    const timerMod = await import("../../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../../src/helpers/CooldownRenderer.js");
    const snackbarMod = await import("../../../src/helpers/showSnackbar.js");
    const scoreboardMod = await import("../../../src/helpers/setupScoreboard.js");

    const timer = timerMod.createRoundTimer({
      starter: (onTick, onExpired) => {
        onTick(3);
        onTick(2);
        onTick(0);
        onExpired();
      }
    });
    attachCooldownRenderer(timer);
    timer.start(3);

    expect(snackbarMod.showSnackbar).toHaveBeenCalledWith("Next round in: 3s");
    expect(snackbarMod.updateSnackbar).toHaveBeenCalledWith("Next round in: 2s");
    expect(scoreboardMod.updateTimer).toHaveBeenCalledWith(3);
    expect(scoreboardMod.updateTimer).toHaveBeenCalledWith(2);
    expect(scoreboardMod.updateTimer).toHaveBeenCalledWith(0);
  });

  it("resolves ready after minimum cooldown in test mode", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { nextButton } = createTimerNodes();
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const controls = roundMod.startCooldown({}, scheduler);
    scheduler.tick(1100);
    await controls.ready;
    expect(nextButton.dataset.nextReady).toBe("true");
    expect(nextButton.disabled).toBe(false);
    setTestMode(false);
    vi.restoreAllMocks();
  });
});
