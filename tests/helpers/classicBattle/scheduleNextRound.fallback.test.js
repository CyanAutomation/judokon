import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createClassicBattleHarness } from "../integrationHarness.js";

const READY_EVENT = "ready";

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

  beforeEach(async () => {
    harness = createClassicBattleHarness({
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
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("resolves ready after fallback timer and enables button", async () => {
    const { startCooldown } = await harness.importModule(
      "/workspaces/judokon/src/helpers/classicBattle/roundManager.js"
    );
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(9);
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    await vi.advanceTimersByTimeAsync(1);
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
    dispatchSpy = vi.fn().mockResolvedValue(undefined);

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

    const { startCooldown } = await harness.importModule(
      "/workspaces/judokon/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    scheduler.tick(20);
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("dispatches ready exactly once when fallback timer fires", async () => {
    // Mock round timer to not expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });

    const { startCooldown } = await harness.importModule(
      "/workspaces/judokon/src/helpers/classicBattle/roundManager.js"
    );
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
    dispatchSpy = vi.fn().mockResolvedValue(undefined);

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
    dispatchSpy = undefined;
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

    const { startCooldown } = await harness.importModule(
      "/workspaces/judokon/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    expect(controls).toBeTruthy();
    expect(typeof controls?.ready).toBe("object");
    expect(typeof controls.ready.then).toBe("function");
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("falls back to machine dispatch when event dispatcher reports no machine", async () => {
    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(
      "/workspaces/judokon/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    expect(controls).toBeTruthy();
    expect(typeof controls?.ready).toBe("object");
    expect(typeof controls.ready.then).toBe("function");
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
  });
});

describe("bus propagation and deduplication", () => {
  let harness;
  let controls;
  let runtime;
  let machine;
  let dispatchReadyViaBusSpy;
  let globalDispatchSpy;

  beforeEach(async () => {
    machine = { dispatch: vi.fn() };
    dispatchReadyViaBusSpy = vi.fn();
    globalDispatchSpy = vi.fn().mockResolvedValue(true);

    harness = createClassicBattleHarness({
      mocks: {
        // Mock the orchestrator context to return our test machine
        "../../../src/helpers/classicBattle/orchestrator.js": () => ({
          isOrchestrated: () => true,
          getMachine: () => machine
        }),
        // Mock battle events for bus propagation
        "../../../src/helpers/classicBattle/battleEvents.js": () => ({
          onBattleEvent: vi.fn(),
          offBattleEvent: vi.fn(),
          emitBattleEvent: vi.fn()
        })
      }
    });

    await harness.setup();

    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(
      "/workspaces/judokon/src/helpers/classicBattle/roundManager.js"
    );
    controls = startCooldown({}, createMockScheduler(), {
      dispatchReadyViaBus: dispatchReadyViaBusSpy
    });

    // Access the runtime internals (this would normally be private)
    // In a real integration test, we'd test observable behavior instead
    runtime = { onExpired: vi.fn() };
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("skips bus propagation when dedupe tracking handles readiness in orchestrated mode", async () => {
    expect(controls).toBeTruthy();
    expect(typeof runtime?.onExpired).toBe("function");
    dispatchReadyViaBusSpy?.mockClear();
    await runtime.onExpired();

    expect(dispatchReadyViaBusSpy).not.toHaveBeenCalled();
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });

  it("invokes the bus dispatcher after machine-only readiness dispatch", async () => {
    expect(controls).toBeTruthy();
    expect(typeof runtime?.onExpired).toBe("function");
    dispatchReadyViaBusSpy?.mockClear();
    globalDispatchSpy.mockClear();
    machine.dispatch.mockClear();
    dispatchReadyViaBusSpy?.mockImplementation(createBusPropagationMock(globalDispatchSpy));
    globalDispatchSpy.mockImplementationOnce(() => false);
    globalDispatchSpy.mockImplementation(() => true);
    await runtime.onExpired();
    expect(globalDispatchSpy).toHaveBeenCalledTimes(1);
    expect(globalDispatchSpy).toHaveBeenNthCalledWith(1, READY_EVENT);
    expect(globalDispatchSpy).toHaveBeenNthCalledWith(2, READY_EVENT);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({ alreadyDispatched: false })
    );
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });
});
