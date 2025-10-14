import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";
import { useCanonicalTimers } from "./setup/fakeTimers.js";
import {
  createBattleStore,
  startCooldown,
  _resetForTest,
  __testFinalizeReadyControls as finalizeReadyControlsForTest
} from "../src/helpers/classicBattle/roundManager.js";
import {
  detectOrchestratorContext,
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

describe("startCooldown", () => {
  test("emits countdown started event with duration from global override", () => {
    const store = createBattleStore();
    const previousOverride = window.__NEXT_ROUND_COOLDOWN_MS;
    window.__NEXT_ROUND_COOLDOWN_MS = 7000;

    const mockDependencies = createMockCooldownDependencies();

    try {
      const controls = startCooldown(store, mockDependencies.scheduler, mockDependencies.options);

      expect(mockDependencies.emitSpy).toHaveBeenCalledWith("control.countdown.started", {
        durationMs: 7000
      });
      expect(controls).toBeDefined();
      expect(controls.ready).toBeInstanceOf(Promise);
      expect(typeof controls.resolveReady).toBe("function");
    } finally {
      if (typeof previousOverride === "number") {
        window.__NEXT_ROUND_COOLDOWN_MS = previousOverride;
      } else {
        delete window.__NEXT_ROUND_COOLDOWN_MS;
      }
    }
  });

  test("emits default countdown duration when global override is missing", () => {
    const store = createBattleStore();
    const previousOverride = window.__NEXT_ROUND_COOLDOWN_MS;
    delete window.__NEXT_ROUND_COOLDOWN_MS;

    const mockDependencies = createMockCooldownDependencies();

    try {
      startCooldown(store, mockDependencies.scheduler, mockDependencies.options);

      expect(mockDependencies.emitSpy).toHaveBeenCalledWith("control.countdown.started", {
        durationMs: 3000
      });
    } finally {
      if (typeof previousOverride === "number") {
        window.__NEXT_ROUND_COOLDOWN_MS = previousOverride;
      } else {
        delete window.__NEXT_ROUND_COOLDOWN_MS;
      }
    }
  });

  test("clamps countdown duration for non-positive overrides", () => {
    const previousOverride = window.__NEXT_ROUND_COOLDOWN_MS;
    const testClampingBehavior = (overrideValue) => {
      window.__NEXT_ROUND_COOLDOWN_MS = overrideValue;

      const mockDependencies = createMockCooldownDependencies();

      startCooldown(createBattleStore(), mockDependencies.scheduler, mockDependencies.options);

      expect(mockDependencies.emitSpy).toHaveBeenCalledWith("control.countdown.started", {
        durationMs: 1000
      });
    };

    try {
      testClampingBehavior(0);
      testClampingBehavior(-500);
    } finally {
      if (typeof previousOverride === "number") {
        window.__NEXT_ROUND_COOLDOWN_MS = previousOverride;
      } else {
        delete window.__NEXT_ROUND_COOLDOWN_MS;
      }
    }
  });

  test("uses injected scheduler to resolve ready before fallback timers", async () => {
    const defaultHarness = createSchedulerHarness();
    const defaultControls = startCooldown(createBattleStore(), null, defaultHarness.overrides);

    expect(defaultHarness.fallbacks).toHaveLength(1);
    expect(defaultControls.readyDispatched).toBe(false);

    const schedulerInvocations = [];
    const injectedScheduler = {
      setTimeout: vi.fn((cb, ms) => {
        schedulerInvocations.push({ cb, ms });
        return Symbol("injected-scheduler");
      }),
      clearTimeout: vi.fn()
    };

    const harness = createSchedulerHarness();
    const controls = startCooldown(createBattleStore(), injectedScheduler, harness.overrides);

    expect(injectedScheduler.setTimeout).toHaveBeenCalledTimes(1);
    expect(harness.fallbacks).toHaveLength(1);
    expect(controls.readyDispatched).toBe(false);

    // Integration coverage replaces the previous resolveActiveScheduler helper test
    // by asserting the injected scheduler completes readiness before the fallback
    // timer has a chance to fire.

    expect(schedulerInvocations).toHaveLength(1);
    schedulerInvocations[0].cb();

    await expect(controls.ready).resolves.toBeUndefined();
    expect(controls.readyDispatched).toBe(true);

    // Verify the fallback timer remains dormant since injected scheduler resolved first
    expect(harness.fallbacks[0].fired).toBe(false);

    // The fallback timer should not affect the already-resolved ready promise
    harness.fallbacks[0].run();
    expect(harness.fallbacks[0].fired).toBe(true);
    // Ready promise should still be resolved (no change in behavior)
    await expect(controls.ready).resolves.toBeUndefined();
  });
});

function createMockCooldownDependencies() {
  const emitSpy = vi.fn();
  /**
   * Stores scheduled callbacks keyed by timer identifier so tests can inspect
   * the registered handlers via `mockDependencies.timerHandlers.get(name)`
   * and assert the expected callbacks were wired.
   */
  const timerHandlers = new Map();
  const scheduler = {
    setTimeout: vi.fn((cb, ms) => {
      timerHandlers.set("timeout", { cb, ms });
      return Symbol("scheduler-timeout");
    }),
    clearTimeout: vi.fn()
  };

  const options = {
    eventBus: { emit: emitSpy, on: vi.fn(), off: vi.fn() },
    createRoundTimer: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      on: vi.fn((event, handler) => {
        timerHandlers.set(event, handler);
      })
    })),
    attachCooldownRenderer: vi.fn(),
    requireEngine: vi.fn(() => ({ startCoolDown: vi.fn() })),
    setSkipHandler: vi.fn(),
    setupFallbackTimer: vi.fn(() => Symbol("fallback-timeout")),
    dispatchBattleEvent: vi.fn(),
    markReady: vi.fn(),
    showSnackbar: vi.fn(),
    scoreboard: { showMessage: vi.fn() },
    getStateSnapshot: vi.fn(() => ({ state: "cooldown" })),
    isOrchestrated: () => false,
    startEngineCooldown: vi.fn(),
    getClassicBattleMachine: () => null
  };

  return { emitSpy, scheduler, options, timerHandlers };
}

function createSchedulerHarness() {
  const fallbacks = [];
  const overrides = {
    eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    attachCooldownRenderer: vi.fn(),
    createRoundTimer: vi.fn(() => ({
      start: vi.fn(),
      on: vi.fn(),
      stop: vi.fn()
    })),
    setupFallbackTimer: vi.fn((ms, cb) => {
      const record = {
        id: fallbacks.length + 1,
        ms,
        fired: false,
        run: () => {
          record.fired = true;
          cb();
        }
      };
      fallbacks.push(record);
      return record.id;
    }),
    dispatchBattleEvent: vi.fn(),
    markReady: vi.fn(),
    showSnackbar: vi.fn(),
    scoreboard: { showMessage: vi.fn() },
    setSkipHandler: vi.fn(),
    requireEngine: vi.fn(() => ({ startCoolDown: vi.fn() })),
    getStateSnapshot: vi.fn(() => ({ state: "cooldown" })),
    isOrchestrated: () => false,
    getClassicBattleMachine: () => null
  };

  return { overrides, fallbacks };
}

function createOrchestratorOverrides({ orchestrated, machine }) {
  const harness = createSchedulerHarness();
  harness.overrides.isOrchestrated = () => orchestrated;
  harness.overrides.getClassicBattleMachine = () => machine;
  harness.overrides.getStateSnapshot = vi.fn(() => ({ state: "cooldown" }));
  delete harness.overrides.markReady;
  return harness.overrides;
}

function createNextButtonStub() {
  const attributes = new Map();
  const dataset = { nextReady: "false" };

  return {
    id: "next-button",
    disabled: true,
    dataset,
    setAttribute: vi.fn(function (name, value) {
      attributes.set(name, value);
      if (name === "disabled") {
        this.disabled = value !== null && value !== false;
      }
      if (name === "data-next-ready") {
        dataset.nextReady = String(value);
      }
    }),
    removeAttribute: vi.fn(function (name) {
      attributes.delete(name);
      if (name === "disabled") {
        this.disabled = false;
      }
      if (name === "data-next-ready") {
        delete dataset.nextReady;
      }
    }),
    getAttribute(name) {
      return attributes.get(name);
    }
  };
}

function stubNextButtonLookup(primary, fallback = null) {
  const originalGetElementById = document.getElementById;
  const originalQuerySelector = document.querySelector;

  document.getElementById = (id) => {
    if (id === "next-button") return primary;
    return originalGetElementById.call(document, id);
  };

  document.querySelector = (selector) => {
    if (selector === '[data-role="next-round"]') return fallback;
    return originalQuerySelector.call(document, selector);
  };

  return () => {
    document.getElementById = originalGetElementById;
    document.querySelector = originalQuerySelector;
  };
}

function exposeMachineForTest(machine) {
  const existingMap = window.__classicBattleDebugMap;
  const hadMap = Boolean(existingMap);
  const hadKey = hadMap ? existingMap.has("getClassicBattleMachine") : false;
  const previousValue = hadKey ? existingMap.get("getClassicBattleMachine") : undefined;

  exposeDebugState("getClassicBattleMachine", () => machine);

  return () => {
    const debugMap = window.__classicBattleDebugMap;
    if (!debugMap) return;

    if (hadKey) {
      debugMap.set("getClassicBattleMachine", previousValue);
    } else {
      debugMap.delete("getClassicBattleMachine");
      if (!hadMap && debugMap.size === 0) {
        delete window.__classicBattleDebugMap;
      }
    }
  };
}

describe("startCooldown orchestrator context integration", () => {
  /**
   * @spec startCooldown must immediately surface Next button readiness when no orchestrator is detected so manual flows stay interactive.
   */
  test("startCooldown marks Next button ready immediately when orchestration is absent", () => {
    const store = createBattleStore();
    const nextBtn = createNextButtonStub();
    const restoreLookup = stubNextButtonLookup(nextBtn);
    const overrides = createOrchestratorOverrides({ orchestrated: false, machine: null });

    try {
      startCooldown(store, null, overrides);
      timers.runAllTimers();

      expect(nextBtn.disabled).toBe(false);
      expect(nextBtn.dataset.nextReady).toBe("true");
      expect(nextBtn.setAttribute).toHaveBeenCalledWith("data-next-ready", "true");
      expect(nextBtn.removeAttribute).toHaveBeenCalledWith("disabled");
    } finally {
      restoreLookup();
    }
  });

  /**
   * @spec startCooldown must defer Next button readiness while the orchestrator controls cooldown state so the UI stays locked until orchestration resolves it.
   */
  test("startCooldown defers Next button readiness while orchestrator machine owns cooldown state", () => {
    const store = createBattleStore();
    const nextBtn = createNextButtonStub();
    const restoreLookup = stubNextButtonLookup(nextBtn);
    const machine = {
      getState: vi.fn(() => "cooldown")
    };
    const restoreMachine = exposeMachineForTest(machine);
    const overrides = createOrchestratorOverrides({ orchestrated: true, machine });

    try {
      const controls = startCooldown(store, null, overrides);
      timers.runAllTimers();

      expect(nextBtn.disabled).toBe(true);
      expect(nextBtn.dataset.nextReady).toBe("false");
      expect(nextBtn.setAttribute).not.toHaveBeenCalledWith("data-next-ready", "true");
      expect(nextBtn.removeAttribute).not.toHaveBeenCalledWith("disabled");
      expect(controls.readyDispatched).toBe(false);
    } finally {
      restoreMachine();
      restoreLookup();
    }
  });
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
