import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createSimpleHarness } from "../integrationHarness.js";
import { resetDispatchHistory } from "/src/helpers/classicBattle/eventDispatcher.js";

const READY_EVENT = "ready";
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "../../..");
const ROUND_MANAGER_MODULE = pathToFileURL(
  resolve(REPO_ROOT, "src/helpers/classicBattle/roundManager.js")
).href;
const EVENT_DISPATCHER_MODULE = "/src/helpers/classicBattle/eventDispatcher.js";
const EVENT_DISPATCHER_FILE_URL = pathToFileURL(
  resolve(REPO_ROOT, "src/helpers/classicBattle/eventDispatcher.js")
).href;
const EXPIRATION_HANDLERS_MODULE = pathToFileURL(
  resolve(REPO_ROOT, "src/helpers/classicBattle/nextRound/expirationHandlers.js")
).href;
const ROUND_READY_STATE_MODULE = pathToFileURL(
  resolve(REPO_ROOT, "src/helpers/classicBattle/roundReadyState.js")
).href;

/**
 * Create a dispatcher mock that replays candidate dispatchers before falling
 * back to the provided global dispatcher.
 *
 * @param {import('vitest').Mock} globalDispatcher - Fallback dispatcher spy.
 * @returns {(
 *   options: {
 *     skipCandidate?: boolean;
 *     dispatchBattleEvent?: import('vitest').Mock;
 *     alreadyDispatched?: boolean;
 *   }
 * ) => Promise<boolean>} A Vitest-compatible mock implementation.
 */
function createBusPropagationMock(globalDispatcher) {
  return async function busPropagationMock(options = {}) {
    const dispatchers = [];
    if (options.skipCandidate !== true && typeof options.dispatchBattleEvent === "function") {
      dispatchers.push(options.dispatchBattleEvent);
    }
    if (
      typeof globalDispatcher === "function" &&
      globalDispatcher !== options.dispatchBattleEvent
    ) {
      dispatchers.push(globalDispatcher);
    }
    if (options.alreadyDispatched) {
      return true;
    }
    for (const dispatcher of dispatchers) {
      const result = dispatcher(READY_EVENT);
      const resolved = await Promise.resolve(result);
      if (resolved !== false) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Shared mock state for all test suites.
 * Uses vi.hoisted() to ensure these are created before module imports.
 */
const mockState = vi.hoisted(() => ({
  dispatchSpyRef: { current: null },

  nextRoundCooldown: 0
}));

/**
 * Top-level mocks for dependencies.
 * These are registered at static analysis time by Vitest.
 */

// Mock event dispatcher (specifier 1: alias)
const dispatcherMockRef = vi.hoisted(() => vi.fn(() => true));
vi.mock("/src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatcherMockRef,
  resetDispatchHistory: vi.fn()
}));

// Mock battle engine facade with scheduler support
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  requireEngine: () => ({
    startRound: mockMakeTimer,
    startCoolDown: mockMakeTimer,
    stopTimer: vi.fn(),
    STATS: ["a", "b"]
  }),
  startRound: mockMakeTimer,
  startCoolDown: mockMakeTimer,
  stopTimer: vi.fn(),
  STATS: ["a", "b"]
}));

function mockMakeTimer(onTick, onExpired, duration) {
  onTick(duration);
  if (duration <= 0) {
    onExpired();
    return;
  }
  if (!mockState.scheduler) return;
  for (let i = 1; i <= duration; i++) {
    mockState.scheduler.setTimeout(() => {
      const remaining = duration - i;
      onTick(remaining);
      if (remaining <= 0) onExpired();
    }, i * 1000);
  }
}

// Mock computeNextRoundCooldown
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: () => mockState.nextRoundCooldown
}));

// Mock debugHooks
vi.mock("../../../src/helpers/classicBattle/debugHooks.js", () => {
  const mock = {
    readDebugState: vi.fn(() => null),
    exposeDebugState: vi.fn()
  };
  return { ...mock, default: mock };
});

// Mock debugPanel
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));

describe("startCooldown fallback timer", () => {
  let harness;

  beforeEach(async () => {
    dispatcherMockRef.mockImplementation(() => true);
    mockState.scheduler = null;

    harness = createSimpleHarness({ useFakeTimers: false });
    await harness.setup();

    mockState.scheduler = createMockScheduler();
    resetDispatchHistory();
    document.body.innerHTML = "";
    createTimerNodes();

    // Mock the round timer to not expire for fallback testing
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });
  });

  afterEach(() => {
    harness.cleanup();
    dispatcherMockRef.mockClear();
  });

  it("resolves ready after fallback timer and enables button", async () => {
    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, mockState.scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });
    mockState.scheduler.tick(9);
    await controls.ready;
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    mockState.scheduler.tick(1);
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });

  it("resolves ready when dispatcher reports false and enables button", async () => {
    dispatcherMockRef.mockImplementation(() => false);
    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, mockState.scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });

    mockState.scheduler.tick(9);
    await controls.ready;

    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});

describe("startCooldown ready dispatch discipline", () => {
  let harness;

  beforeEach(async () => {
    mockState.dispatchSpy = vi.fn(() => undefined);
    mockState.nextRoundCooldown = 1;

    harness = createSimpleHarness();
    await harness.setup();

    scheduler = createMockScheduler();
    mockState.scheduler = scheduler;
    document.body.innerHTML = "";
    createTimerNodes();

    const dispatcherModule = await harness.importModule(EVENT_DISPATCHER_MODULE);
    expect(dispatcherModule.dispatchBattleEvent).toBe(mockState.dispatchSpy);
    resetDispatchHistory();
  });

  afterEach(() => {
    harness.cleanup();
    mockState.dispatchSpy = null;
    mockState.nextRoundCooldown = 0;
  });

  it("dispatches ready exactly once when round timer expires", async () => {
    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("dispatches ready exactly once when fallback timer fires", async () => {
    // Mock round timer to not expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    scheduler.tick(20);
    expect(mockState.dispatchSpy).not.toHaveBeenCalled();
    scheduler.tick(1000);
    scheduler.tick(1000);
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
    await vi.runAllTimersAsync();
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("handleNextRoundExpiration immediate readiness", () => {
  let harness;
  let scheduler;

  beforeEach(async () => {
    mockState.dispatchSpy = vi.fn();
    mockState.dispatchSpy = mockState.dispatchSpy.mockResolvedValue(undefined);

    harness = createSimpleHarness();
    await harness.setup();

    scheduler = createMockScheduler();
    mockState.scheduler = scheduler;
    document.body.innerHTML = "";
    createTimerNodes();

    const dispatcherModule = await harness.importModule(EVENT_DISPATCHER_FILE_URL);
    expect(dispatcherModule.dispatchBattleEvent).toBe(mockState.dispatchSpy);
    const dispatcherAliasModule = await harness.importModule(EVENT_DISPATCHER_MODULE);
    expect(dispatcherAliasModule.dispatchBattleEvent).toBe(mockState.dispatchSpy);
    resetDispatchHistory();
  });

  afterEach(() => {
    harness.cleanup();
    mockState.dispatchSpy = null;
  });

  it("dispatches ready when state already progressed past cooldown", async () => {
    // Mock round timer to expire immediately
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler);
    expect(controls).toBeTruthy();
    expect(typeof controls?.ready).toBe("object");
    expect(typeof controls.ready.then).toBe("function");
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("falls back to machine dispatch when event dispatcher reports no machine", async () => {
    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler);
    expect(controls).toBeTruthy();
    expect(typeof controls?.ready).toBe("object");
    expect(typeof controls.ready.then).toBe("function");
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
  });
});

describe("bus propagation and deduplication", () => {
  let harness;
  let machine;
  let dispatchReadyViaBusSpy;
  let expirationHandlersModule;

  beforeEach(async () => {
    machine = { dispatch: vi.fn() };
    machine.state = { value: "idle" };
    mockState.dispatchSpy = vi.fn(() => true);

    harness = createSimpleHarness();
    await harness.setup();

    expirationHandlersModule = await harness.importModule(EXPIRATION_HANDLERS_MODULE);
    dispatchReadyViaBusSpy = vi.spyOn(expirationHandlersModule, "dispatchReadyViaBus");

    const dispatcherModule = await harness.importModule(EVENT_DISPATCHER_MODULE);
    expect(dispatcherModule.dispatchBattleEvent).toBe(mockState.dispatchSpy);
  });

  afterEach(() => {
    harness.cleanup();
    mockState.dispatchSpy = null;
  });

  it("skips bus propagation when dedupe tracking handles readiness in orchestrated mode", async () => {
    dispatchReadyViaBusSpy?.mockClear();
    mockState.dispatchSpy.mockClear();
    const directResult = await expirationHandlersModule.dispatchReadyDirectly({
      machineReader: () => machine
    });
    const busResult = await expirationHandlersModule.dispatchReadyViaBus({
      dispatchBattleEvent: mockState.dispatchSpy,
      alreadyDispatched: directResult.dispatched && directResult.dedupeTracked
    });
    expect(busResult).toBe(true);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({ alreadyDispatched: true })
    );
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
    expect(directResult).toEqual({ dispatched: true, dedupeTracked: true });
  });

  it("invokes the bus dispatcher after machine-only readiness dispatch", async () => {
    dispatchReadyViaBusSpy?.mockClear();
    mockState.dispatchSpy.mockClear();
    dispatchReadyViaBusSpy?.mockImplementation(createBusPropagationMock(mockState.dispatchSpy));
    mockState.dispatchSpy.mockImplementationOnce(() => false);
    mockState.dispatchSpy.mockImplementation(() => true);
    const directResult = await expirationHandlersModule.dispatchReadyDirectly({
      machineReader: () => machine
    });
    const busResult = await expirationHandlersModule.dispatchReadyViaBus({
      dispatchBattleEvent: mockState.dispatchSpy,
      alreadyDispatched: directResult.dispatched && directResult.dedupeTracked
    });
    expect(busResult).toBe(true);
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(2);
    expect(mockState.dispatchSpy).toHaveBeenNthCalledWith(1, READY_EVENT);
    expect(mockState.dispatchSpy).toHaveBeenNthCalledWith(2, READY_EVENT);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dispatchBattleEvent: mockState.dispatchSpy,
        alreadyDispatched: false
      })
    );
    expect(directResult).toEqual({ dispatched: true, dedupeTracked: false });
  });
});

describe("fallback readiness flag discipline", () => {
  let harness;

  beforeEach(async () => {
    mockState.dispatchSpy = vi.fn(() => true);
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
    const expirationHandlersModule = await harness.importModule(EXPIRATION_HANDLERS_MODULE);
    const readyStateModule = await harness.importModule(ROUND_READY_STATE_MODULE);
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

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler, {
      dispatchBattleEvent: vi.fn(() => false),
      useGlobalReadyFallback: true,
      getClassicBattleMachine: () => ({ state: { value: "cooldown" } }),
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
      expect(guardResult).toEqual({ dispatched: true, fallbackDispatched: false });
      expect(emitTelemetry).toHaveBeenCalledWith("handleNextRoundDispatchResult", true);
    } finally {
      readyStateModule.setReadyDispatchedForCurrentCooldown(false);
      vi.restoreAllMocks();
    }
  });
});
