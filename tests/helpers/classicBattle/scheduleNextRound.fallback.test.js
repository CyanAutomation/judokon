import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createClassicBattleHarness } from "../integrationHarness.js";
import { resetDispatchHistory } from "../../../src/helpers/classicBattle/eventDispatcher.js";
import {
  dispatchReadyDirectly,
  dispatchReadyViaBus
} from "../../../src/helpers/classicBattle/nextRound/expirationHandlers.js";
import { exposeDebugState } from "../../../src/helpers/classicBattle/debugHooks.js";

const READY_EVENT = "ready";
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "../../..");
const ROUND_MANAGER_MODULE = pathToFileURL(
  resolve(REPO_ROOT, "src/helpers/classicBattle/roundManager.js")
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

describe("startCooldown fallback timer", () => {
  let harness;
  let scheduler;
  /** @type {import('vitest').Mock} */
  let dispatchSpy;

  beforeEach(async () => {
    dispatchSpy = vi.fn(() => true);
    harness = createClassicBattleHarness({
      useFakeTimers: false,
      mocks: {
        // Mock the battle engine facade to control timer behavior
        "../../../src/helpers/battleEngineFacade.js": () => {
          const makeTimer = (onTick, onExpired, duration) => {
            onTick(duration);
            if (duration <= 0) {
              onExpired();
              return;
            }
            for (let i = 1; i <= duration; i++) {
              scheduler.setTimeout(() => {
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
        },
        // Mock computeNextRoundCooldown to return 0 for predictable timing
        "../../../src/helpers/timers/computeNextRoundCooldown.js": () => ({
          computeNextRoundCooldown: () => 0
        }),
        // Mock eventDispatcher to return true for dispatchBattleEvent
        "../../../src/helpers/classicBattle/eventDispatcher.js": () => ({
          dispatchBattleEvent: dispatchSpy,
          resetDispatchHistory: vi.fn()
        }),
        // Mock debugHooks to return null for readDebugState
        "../../../src/helpers/classicBattle/debugHooks.js": () => ({
          readDebugState: vi.fn(() => null)
        }),
        // Mock debugPanel to avoid slow updateDebugPanel
        "../../../src/helpers/classicBattle/debugPanel.js": () => ({
          updateDebugPanel: vi.fn()
        })
      }
    });

    await harness.setup();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();

    // Mock the round timer to not expire for fallback testing
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });
    resetDispatchHistory();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("resolves ready after fallback timer and enables button", async () => {
    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });
    scheduler.tick(9);
    await controls.ready;
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    scheduler.tick(1);
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });

  it("resolves ready when dispatcher reports false and enables button", async () => {
    dispatchSpy.mockImplementation(() => false);
    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });

    scheduler.tick(9);
    await controls.ready;

    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});

describe("startCooldown ready dispatch discipline", () => {
  let harness;
  let scheduler;
  /** @type {import('vitest').Mock} */
  let dispatchSpy;

  beforeEach(async () => {
    dispatchSpy = vi.fn();
    dispatchSpy.mockResolvedValue(undefined);

    harness = createClassicBattleHarness({
      mocks: {
        // Mock event dispatcher to track ready events
        "../../../src/helpers/classicBattle/eventDispatcher.js": () => ({
          dispatchBattleEvent: dispatchSpy,
          resetDispatchHistory: vi.fn()
        }),
        // Mock computeNextRoundCooldown to return 1 second
        "../../../src/helpers/timers/computeNextRoundCooldown.js": () => ({
          computeNextRoundCooldown: () => 1
        })
      }
    });

    await harness.setup();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("dispatches ready exactly once when round timer expires", async () => {
    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("dispatches ready exactly once when fallback timer fires", async () => {
    // Mock round timer to not expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });

    const { startCooldown } = await harness.importModule(ROUND_MANAGER_MODULE);
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    scheduler.tick(20);
    expect(dispatchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    scheduler.tick(1000);
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    await vi.runAllTimersAsync();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("handleNextRoundExpiration immediate readiness", () => {
  let harness;
  let scheduler;
  /** @type {import('vitest').Mock} */
  let dispatchSpy;

  beforeEach(async () => {
    dispatchSpy = vi.fn();
    dispatchSpy.mockResolvedValue(undefined);

    harness = createClassicBattleHarness({
      mocks: {
        // Mock event dispatcher
        "../../../src/helpers/classicBattle/eventDispatcher.js": () => ({
          dispatchBattleEvent: dispatchSpy,
          resetDispatchHistory: vi.fn()
        })
      }
    });

    await harness.setup();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
  });

  afterEach(() => {
    harness.cleanup();
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
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
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
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
  });
});

describe("bus propagation and deduplication", () => {
  let machine;
  let dispatchReadyViaBusSpy;
  let globalDispatchSpy;
  let restoreDispatch;

  beforeEach(async () => {
    machine = { dispatch: vi.fn() };
    dispatchReadyViaBusSpy = vi.fn();
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    globalDispatchSpy = vi.spyOn(eventDispatcher, "dispatchBattleEvent").mockResolvedValue(true);
    exposeDebugState("getClassicBattleMachine", () => machine);
    restoreDispatch = () => {
      globalDispatchSpy.mockRestore();
      exposeDebugState("getClassicBattleMachine", undefined);
    };
  });

  afterEach(() => {
    restoreDispatch?.();
  });

  it("skips bus propagation when dedupe tracking handles readiness in orchestrated mode", async () => {
    const result = await dispatchReadyDirectly({
      machineReader: () => machine,
      emitTelemetry: vi.fn()
    });

    expect(result).toEqual({ dispatched: true, dedupeTracked: true });
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
    expect(machine.dispatch).toHaveBeenCalledWith("ready", undefined);

    await dispatchReadyViaBus({
      dispatchBattleEvent: dispatchReadyViaBusSpy,
      alreadyDispatched: true
    });

    expect(dispatchReadyViaBusSpy).not.toHaveBeenCalled();
  });

  it("invokes the bus dispatcher after machine-only readiness dispatch", async () => {
    globalDispatchSpy.mockClear();
    globalDispatchSpy.mockImplementationOnce(() => false);
    globalDispatchSpy.mockImplementation(() => true);

    await dispatchReadyDirectly({
      machineReader: () => machine,
      emitTelemetry: vi.fn()
    });

    dispatchReadyViaBusSpy.mockImplementation(createBusPropagationMock(globalDispatchSpy));

    await dispatchReadyViaBus({
      dispatchBattleEvent: dispatchReadyViaBusSpy,
      alreadyDispatched: false
    });

    expect(globalDispatchSpy).toHaveBeenCalledTimes(1);
    expect(globalDispatchSpy).toHaveBeenCalledWith(READY_EVENT);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledWith(READY_EVENT);
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
    expect(machine.dispatch).toHaveBeenCalledWith("ready", undefined);
  });
});
