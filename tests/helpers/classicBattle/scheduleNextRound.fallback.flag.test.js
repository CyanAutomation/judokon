import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createSimpleHarness } from "../integrationHarness.js";

/**
 * Shared mock state for all test suites.
 * Uses vi.hoisted() to ensure these are created before module imports.
 */
const mockState = vi.hoisted(() => ({
  dispatchSpy: null,
  scheduler: null
}));

// Mock event dispatcher (specifier 1: alias)
const dispatcherMockRef = vi.hoisted(() => vi.fn(() => true));
vi.mock("/src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatcherMockRef,
  resetDispatchHistory: vi.fn()
}));

describe("fallback readiness flag discipline", () => {
  let harness;
  let scheduler;

  beforeEach(async () => {
    mockState.dispatchSpy = dispatcherMockRef;
    mockState.dispatchSpy.mockReturnValue(true);

    harness = createSimpleHarness();
    await harness.setup();

    scheduler = createMockScheduler();
    mockState.scheduler = scheduler;
    document.body.innerHTML = "";
    createTimerNodes();
  });

  afterEach(() => {
    harness.cleanup();
    mockState.dispatchSpy = null;
    mockState.scheduler = null;
  });

  it("marks readiness after fallback dispatch and short-circuits future attempts", async () => {
    const expirationHandlersModule = await harness.importModule(
      "/src/helpers/classicBattle/nextRound/expirationHandlers.js"
    );
    const readyStateModule = await harness.importModule(
      "/src/helpers/classicBattle/roundReadyState.js"
    );
    const capturedCalls = [];
    const runReadySpy = vi
      .spyOn(expirationHandlersModule, "runReadyDispatchStrategies")
      .mockImplementation(async (options = {}) => {
        capturedCalls.push(options);
        return { dispatched: false, fallbackDispatched: true };
      });
    const setReadySpy = vi.spyOn(readyStateModule, "setReadyDispatchedForCurrentCooldown");
    readyStateModule.setReadyDispatchedForCurrentCooldown(false);

    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(
      "/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler, {
      dispatchBattleEvent: vi.fn(() => false),
      useGlobalReadyFallback: true,
      getClassicBattleMachine: () => ({ state: { value: "roundWait" } }),
      isOrchestrated: () => true
    });

    await vi.runAllTimersAsync();
    await controls.ready;

    expect(runReadySpy).toHaveBeenCalledTimes(1);
    expect(capturedCalls[0]?.alreadyDispatchedReady).toBe(false);
    expect(capturedCalls[0]?.returnOutcome).toBe(true);
    expect(setReadySpy).toHaveBeenCalledWith(true);
    expect(readyStateModule.hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

    const emitTelemetry = vi.fn();
    const guardStrategies = [vi.fn(() => true)];
    runReadySpy.mockRestore();
    setReadySpy.mockRestore();

    try {
      const guardResult = await expirationHandlersModule.runReadyDispatchStrategies({
        alreadyDispatchedReady: readyStateModule.hasReadyBeenDispatchedForCurrentCooldown(),
        strategies: guardStrategies,
        emitTelemetry,
        returnOutcome: true
      });
      expect(guardStrategies[0]).not.toHaveBeenCalled();
      expect(guardResult).toEqual({
        dispatched: true,
        fallbackDispatched: false
      });
      expect(emitTelemetry).toHaveBeenCalledWith("handleNextRoundDispatchResult", true);
    } finally {
      readyStateModule.setReadyDispatchedForCurrentCooldown(false);
      vi.restoreAllMocks();
    }
  });
});
