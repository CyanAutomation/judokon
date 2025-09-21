import { beforeEach, afterEach, test, expect, vi } from "vitest";
import { useCanonicalTimers } from "./setup/fakeTimers.js";
import {
  createBattleStore,
  startCooldown,
  _resetForTest,
  __testFinalizeReadyControls as finalizeReadyControlsForTest
} from "../src/helpers/classicBattle/roundManager.js";
import {
  detectOrchestratorContext,
  initializeCooldownTelemetry,
  resolveActiveScheduler,
  createCooldownControls,
  createExpirationDispatcher
} from "../src/helpers/classicBattle/cooldownOrchestrator.js";
import { exposeDebugState, readDebugState } from "../src/helpers/classicBattle/debugHooks.js";

let timers;

beforeEach(() => {
  timers = useCanonicalTimers();
  // Ensure clean DOM and test env
  document.body.innerHTML = "";
  // Reset any debug dataset
  delete document.body.dataset.battleState;
});

afterEach(() => {
  if (timers) {
    timers.cleanup();
    timers = null;
  }
  try {
    _resetForTest();
  } catch {}
  if (window.__classicBattleDebugMap) {
    window.__classicBattleDebugMap.clear();
  }
});

test("cooldown orchestrator telemetry primes debug counters", () => {
  window.__startCooldownInvoked = false;
  globalThis.__startCooldownCount = 0;
  initializeCooldownTelemetry({ schedulerProvided: true });
  expect(window.__startCooldownInvoked).toBe(true);
  expect(globalThis.__startCooldownCount).toBe(1);
});

test("resolveActiveScheduler prefers injected scheduler", () => {
  const customScheduler = { setTimeout: vi.fn(), clearTimeout: vi.fn() };
  expect(resolveActiveScheduler(customScheduler)).toBe(customScheduler);
  const fallback = resolveActiveScheduler(null);
  expect(typeof fallback.setTimeout).toBe("function");
});

test("detectOrchestratorContext reports debug machine", () => {
  const machine = { id: "orchestrator" };
  exposeDebugState("getClassicBattleMachine", () => machine);
  const result = detectOrchestratorContext(() => false);
  expect(result.machine).toBe(machine);
  expect(result.orchestrated).toBe(true);
});

test("roundManager - cooldown expiry: observe ready dispatch count (baseline)", async () => {
  const store = createBattleStore();

  const machine = {
    dispatch: vi.fn(() => true),
    getState: () => "cooldown"
  };

  const dispatchBattleEventSpy = vi.fn(async () => true);

  const readTraceEntries = () => {
    const trace = readDebugState("nextRoundReadyTrace");
    return Array.isArray(trace) ? trace : [];
  };

  const readTraceEvents = () => readTraceEntries().map((entry) => entry.event);

  const fakeTimerFactory = () => {
    /** @type {Record<string, ((...args: any[]) => void) | undefined>} */
    const handlers = {};
    return {
      start: () => {
        handlers.expired?.();
      },
      on: (event, handler) => {
        handlers[event] = handler;
      },
      stop: () => {}
    };
  };

  exposeDebugState("getClassicBattleMachine", () => machine);

  const controlsWithDispatcher = startCooldown(store, null, {
    isOrchestrated: () => true,
    createRoundTimer: fakeTimerFactory,
    dispatchBattleEvent: dispatchBattleEventSpy,
    getClassicBattleMachine: () => machine
  });

  expect(machine.dispatch).not.toHaveBeenCalled();

  await expect(controlsWithDispatcher.ready).resolves.toBeUndefined();

  expect(dispatchBattleEventSpy).toHaveBeenCalledTimes(1);
  expect(machine.dispatch).not.toHaveBeenCalled();
  expect(controlsWithDispatcher.readyDispatched).toBe(true);

  const traceWithDispatcherEvents = readTraceEvents();
  expect(traceWithDispatcherEvents).toContain("handleNextRoundExpiration.dispatched");

  machine.dispatch.mockClear();
  dispatchBattleEventSpy.mockClear();

  exposeDebugState("getClassicBattleMachine", () => machine);

  const controlsWithMachineFallback = startCooldown(store, null, {
    isOrchestrated: () => true,
    createRoundTimer: fakeTimerFactory,
    getClassicBattleMachine: () => machine
  });

  await expect(controlsWithMachineFallback.ready).resolves.toBeUndefined();

  expect(machine.dispatch.mock.calls.length).toBeGreaterThanOrEqual(1);
  expect(controlsWithMachineFallback.readyDispatched).toBe(true);

  const traceMachineFallbackEvents = readTraceEvents();
  expect(traceMachineFallbackEvents).toContain("handleNextRoundExpiration.start");
  expect(traceMachineFallbackEvents).toContain("resolveReadyInvoked");

  machine.dispatch.mockClear();

  const delayedTimerFactory = () => {
    /** @type {Record<string, ((...args: any[]) => void) | undefined>} */
    const handlers = {};
    return {
      start: () => {
        setTimeout(() => {
          handlers.expired?.();
        }, 0);
      },
      on: (event, handler) => {
        handlers[event] = handler;
      },
      stop: () => {}
    };
  };

  exposeDebugState("getClassicBattleMachine", () => machine);

  const controlsWithDelayedTimer = startCooldown(store, null, {
    isOrchestrated: () => true,
    createRoundTimer: delayedTimerFactory,
    getClassicBattleMachine: () => machine
  });

  expect(controlsWithDelayedTimer.readyDispatched).toBe(false);

  await timers.advanceTimersByTimeAsync(0);
  await expect(controlsWithDelayedTimer.ready).resolves.toBeUndefined();

  const delayedTraceEvents = readTraceEvents();
  expect(delayedTraceEvents).toContain("handleNextRoundExpiration.dispatched");
  expect(
    delayedTraceEvents.filter((event) => event === "resolveReadyInvoked").length
  ).toBeGreaterThanOrEqual(1);
  expect(controlsWithDelayedTimer.readyDispatched).toBe(true);
});

test("finalizeReadyControls guards wrapped resolveReady against reentry", async () => {
  const controls = createCooldownControls();
  const originalResolve = controls.resolveReady;
  const resolveSpy = vi.fn(function resolveReadySpy(...args) {
    return originalResolve.apply(this, args);
  });
  controls.resolveReady = resolveSpy;
  const runtime = {
    bus: { emit: vi.fn() },
    expirationOptions: {},
    timer: null,
    scheduler: { clearTimeout: vi.fn() },
    fallbackId: null,
    schedulerFallbackId: null,
    finalizePromise: null,
    expired: false
  };
  const handleExpiration = vi.fn(async () => {
    finalizeReadyControlsForTest(controls, true);
    return true;
  });
  createExpirationDispatcher({
    controls,
    btn: null,
    runtime,
    handleExpiration,
    getReadyDispatched: () => true
  });
  controls.readyInFlight = true;

  finalizeReadyControlsForTest(controls, true);

  await expect(controls.ready).resolves.toBeUndefined();
  expect(handleExpiration).toHaveBeenCalledTimes(1);
  expect(resolveSpy).toHaveBeenCalledTimes(1);
  expect(controls.readyDispatched).toBe(true);
  expect(controls.readyInFlight).toBe(false);
});
