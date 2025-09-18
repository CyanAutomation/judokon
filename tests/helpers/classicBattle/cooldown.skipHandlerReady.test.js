import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";

describe("skip handler clears fallback timer", () => {
  let scheduler;
  /** @type {ReturnType<typeof vi.spyOn>} */
  let errorSpy;
  /** @type {ReturnType<typeof vi.spyOn>} */
  let warnSpy;
  let timerMockRestore;
  beforeEach(async () => {
    vi.useFakeTimers();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
    document.body.dataset.battleState = "cooldown";
    vi.resetModules();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: vi.fn().mockResolvedValue(undefined),
      resetDispatchHistory: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => {
      const makeTimer = (onTick, onExpired, duration) => {
        onTick(duration);
        if (duration <= 0) {
          onExpired();
          return;
        }
        for (let i = 1; i <= duration; i++) {
          setTimeout(() => {
            const remaining = duration - i;
            onTick(remaining);
            if (remaining <= 0) onExpired();
          }, i * 1000);
        }
      };
      const mockEngine = {
        startRound: makeTimer,
        startCoolDown: makeTimer,
        stopTimer: vi.fn(),
        STATS: ["a", "b"]
      };
      return {
        requireEngine: () => mockEngine,
        startRound: makeTimer,
        startCoolDown: makeTimer,
        stopTimer: vi.fn(),
        STATS: ["a", "b"]
      };
    });
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    timerMockRestore = mockCreateRoundTimer({
      scheduled: false,
      ticks: [],
      expire: false,
      stopEmitsExpired: false
    });
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));
  });

  afterEach(async () => {
    expect(errorSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
    vi.restoreAllMocks();
    timerMockRestore?.unmock?.();
    timerMockRestore = null;
    const { resetSkipState } = await import("../../../src/helpers/classicBattle/skipHandler.js");
    resetSkipState();
  });

  it("registers a skip handler when orchestrator machine is missing", async () => {
    const debugHooks = await import("../../../src/helpers/classicBattle/debugHooks.js");
    debugHooks.exposeDebugState("getClassicBattleMachine", () => null);
    const skipHandler = await import("../../../src/helpers/classicBattle/skipHandler.js");
    const setSkipSpy = vi.spyOn(skipHandler, "setSkipHandler");
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    startCooldown({}, scheduler);
    expect(setSkipSpy).toHaveBeenCalled();
    const registrationCall = setSkipSpy.mock.calls.find(([arg]) => typeof arg === "function");
    expect(typeof registrationCall?.[0]).toBe("function");
    skipHandler.skipCurrentPhase();
    await vi.advanceTimersByTimeAsync(0);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    const FALLBACK_DELAY_MS = 20;
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    expect(warnSpy).toHaveBeenCalledWith("[test] skip: stop nextRoundTimer");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("fires ready once after skipping", async () => {
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { skipCurrentPhase } = await import("../../../src/helpers/classicBattle/skipHandler.js");
    startCooldown({}, scheduler);
    skipCurrentPhase();
    await vi.advanceTimersByTimeAsync(0);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
    const FALLBACK_DELAY_MS = 20; // advance past fallback timeout (10ms) to ensure it would fire if uncleared
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("[test] skip: stop nextRoundTimer");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch ready from fallback timers after manual resolve", async () => {
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    await eventDispatcher.dispatchBattleEvent("ready");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
    const readyPromise = controls.ready;
    controls.resolveReady?.();
    await readyPromise;
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);
    scheduler.tick(50);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
