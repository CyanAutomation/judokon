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
      updateTimer: vi.fn(),
      updateRoundCounter: vi.fn(),
      clearRoundCounter: vi.fn()
    }));
    vi.doMock("../../../src/helpers/SnackbarManager.js", () => {
      const mockController = {
        remove: vi.fn().mockResolvedValue(undefined),
        update: vi.fn()
      };
      return {
        default: {
          show: vi.fn().mockReturnValue(mockController),
          remove: vi.fn(),
          update: vi.fn()
        },
        SnackbarPriority: {
          HIGH: "HIGH",
          NORMAL: "NORMAL",
          LOW: "LOW"
        }
      };
    });
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      skipRoundCooldownIfEnabled: vi.fn(() => false),
      syncScoreDisplay: vi.fn(),
      setNextButtonFinalizedState: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
      setSkipHandler: vi.fn()
    }));
    startCoolDown = vi.fn();
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown,
      stopTimer: vi.fn(),
      STATS: [],
      requireEngine: () => ({ startCoolDown }),
      onEngineCreated: vi.fn(() => () => {})
    }));
    dispatchBattleEvent = vi.fn();
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent,
      resetDispatchHistory: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("chooses advance strategy when ready", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const stop = vi.fn();
    document.body.innerHTML = '<button id="next-button"></button>';
    const btn = document.getElementById("next-button");
    btn.dataset.nextReady = "true";
    await timerMod.onNextButtonClick(new MouseEvent("click"), {
      btn,
      timer: { stop },
      resolveReady: null
    });
    const dispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    expect(stop).not.toHaveBeenCalled();
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
  });

  it("chooses cancel strategy when not ready", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const stop = vi.fn();
    document.body.innerHTML = '<button id="next-button"></button>';
    const btn = document.getElementById("next-button");
    await timerMod.onNextButtonClick(new MouseEvent("click"), {
      btn,
      timer: { stop },
      resolveReady: null
    });
    const dispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    expect(stop).toHaveBeenCalled();
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
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
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    // Click advances immediately; no additional dispatch after fallback timer elapses
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
    scheduler.tick(5000);
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("double clicking Next during cooldown emits a single ready", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { nextButton } = createTimerNodes();
    const controls = roundMod.startCooldown({}, scheduler);
    nextButton.addEventListener("click", (e) => timerMod.onNextButtonClick(e, controls));
    scheduler.tick(100);
    nextButton.click();
    nextButton.click();
    await controls.ready;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("preserves skip handler after manual skip", async () => {
    const timerMod = await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { nextButton } = createTimerNodes();

    let controls = roundMod.startCooldown({}, scheduler);
    nextButton.onclick = (e) => timerMod.onNextButtonClick(e, controls);
    scheduler.tick(100);
    nextButton.click();
    await controls.ready;

    controls = roundMod.startCooldown({}, scheduler);
    nextButton.onclick = (e) => timerMod.onNextButtonClick(e, controls);
    scheduler.tick(100);
    nextButton.click();
    await controls.ready;

    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    // Two manual skips across two cooldowns → 2 ready dispatches
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(2);
  });

  it("stopping timer dispatches ready immediately", async () => {
    const { cancelTimerOrAdvance } = await import(
      "../../../src/helpers/classicBattle/timerService.js"
    );
    const timer = { stop: vi.fn() };
    const resolveReady = vi.fn();
    await cancelTimerOrAdvance(null, timer, resolveReady);
    expect(timer.stop).toHaveBeenCalledTimes(1);
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });

  it("auto-dispatches ready after 1s cooldown", async () => {
    startCoolDown.mockImplementation((_t, onExpired) => {
      onExpired();
    });
    await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    createTimerNodes();
    const controls = roundMod.startCooldown({}, scheduler);
    scheduler.tick(1100);
    await controls.ready;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });

  it("forces a 1s cooldown when test mode is active", async () => {
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const cooldownModule = await import("../../../src/helpers/timers/computeNextRoundCooldown.js");
    const computeSpy = vi.spyOn(cooldownModule, "computeNextRoundCooldown");
    await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    createTimerNodes();
    dispatchBattleEvent.mockClear();
    const controls = roundMod.startCooldown({}, scheduler);
    expect(computeSpy).toHaveBeenCalled();
    const computedValues = computeSpy.mock.results
      .map((result) => result.value)
      .filter((value) => typeof value === "number");
    expect(computedValues).toContain(1);
    scheduler.tick(999);
    expect(dispatchBattleEvent).not.toHaveBeenCalled();
    scheduler.tick(2);
    await controls.ready;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    setTestMode(false);
  });

  it("retains nextReady when starting a new cooldown", async () => {
    await import("../../../src/helpers/classicBattle/timerService.js");
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { nextButton } = createTimerNodes();
    nextButton.dataset.nextReady = "true";
    nextButton.disabled = false;
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;
    const controls = roundMod.startCooldown({}, scheduler);
    expect(nextButton.dataset.nextReady).toBe("true");
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

  it("computeNextRoundCooldown is 0 in headless mode", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { computeNextRoundCooldown } = await import(
      "../../../src/helpers/timers/computeNextRoundCooldown.js"
    );
    expect(computeNextRoundCooldown()).toBeGreaterThanOrEqual(1);
    vi.restoreAllMocks();
  });

  it("CooldownRenderer shows static message", async () => {
    const timerMod = await import("../../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../../src/helpers/CooldownRenderer.js");
    const snackbarManager = (await import("../../../src/helpers/SnackbarManager.js")).default;
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

    expect(snackbarManager.show).toHaveBeenCalledWith({
      message: "Next round in: 3s",
      priority: "HIGH",
      minDuration: 0,
      autoDismiss: 0
    });
    // Snackbar shows static message (no updates after initial render)
    // Scoreboard still updates each tick
    expect(scoreboardMod.updateTimer).toHaveBeenCalledWith(3);
    expect(scoreboardMod.updateTimer).toHaveBeenCalledWith(2);
    expect(scoreboardMod.updateTimer).toHaveBeenCalledWith(0);
  });

  it("resolves ready after minimum cooldown in test mode", async () => {
    await import("../../../src/helpers/classicBattle/timerService.js");
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

  it("resolves ready when orchestrator is already past cooldown after module reset", async () => {
    const debugHooks = await import("../../../src/helpers/classicBattle/debugHooks.js");
    const machine = {
      getState: vi.fn(() => "roundOver"),
      dispatch: vi.fn()
    };
    debugHooks.exposeDebugState("getClassicBattleMachine", () => machine);
    document.body.dataset.battleState = "roundOver";
    const getStateSnapshot = vi.fn(() => ({ state: "roundDecision" }));
    const setupFallbackTimer = vi.fn((_ms, cb) => {
      cb();
      return null;
    });
    dispatchBattleEvent.mockReturnValueOnce(true);
    const roundMod = await import("../../../src/helpers/classicBattle/roundManager.js");
    try {
      const controls = roundMod.startCooldown({}, scheduler, {
        getStateSnapshot,
        setupFallbackTimer,
        dispatchBattleEvent
      });
      await expect(controls.ready).resolves.toBeUndefined();
      expect(setupFallbackTimer).toHaveBeenCalled();
      expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
      expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
      expect(machine.dispatch).toHaveBeenCalledWith("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(1);
      expect(getStateSnapshot).toHaveBeenCalled();
    } finally {
      debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
      delete document.body.dataset.battleState;
    }
  });
});
