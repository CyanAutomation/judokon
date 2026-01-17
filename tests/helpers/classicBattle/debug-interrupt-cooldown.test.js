import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createTimerNodes } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

// Define mock behaviors at module level to be re-applied per test
vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dispatchBattleEvent: vi.fn(async (...args) => {
      const [eventName] = args;
      console.log("[MOCK] dispatchBattleEvent called with:", eventName);
      const result = await actual.dispatchBattleEvent(...args);
      if (eventName === "ready") {
        console.log("[MOCK] Returning true for ready");
        return true;
      }
      return result;
    })
  };
});

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (cb) => {
    await cb?.();
  })
}));

vi.mock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDefaultTimer: vi.fn(async () => 1),
    createCountdownTimer: vi.fn(() => {
      let tickHandler = null;
      return {
        on: vi.fn((event, handler) => {
          if (event === "tick") {
            tickHandler = handler;
          }
        }),
        start: vi.fn(() => {
          if (tickHandler) {
            vi.setSystemTime(Date.now() + 1000);
            tickHandler(1);
          }
        }),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn()
      };
    })
  };
});

// Mock createRoundTimer to use immediate expiration for deterministic test behavior
vi.mock("../../../src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: vi.fn(() => {
    const handlers = { tick: new Set(), expired: new Set() };
    return {
      on: vi.fn((evt, fn) => handlers[evt]?.add(fn)),
      off: vi.fn((evt, fn) => handlers[evt]?.delete(fn)),
      start: vi.fn((dur) => {
        // Emit ticks synchronously, then expire on next microtask
        const ticks = dur > 0 ? [dur, dur - 1, 0] : [0];
        ticks.forEach((val) => handlers.tick.forEach((fn) => fn(val)));
        // Schedule expiration on next microtask to allow event handlers to register
        queueMicrotask(() => {
          handlers.expired.forEach((fn) => fn());
        });
      }),
      stop: vi.fn(() => {
        queueMicrotask(() => {
          handlers.expired.forEach((fn) => fn());
        });
      }),
      pause: vi.fn(),
      resume: vi.fn()
    };
  })
}));

// Track ready events across test runs
let readyDispatchTracker = { events: [] };
let timersControl = null;

describe("DEBUG: interrupt cooldown ready dispatch", () => {
  setupClassicBattleHooks();

  beforeEach(async () => {
    // 1. Reset module cache to get fresh imports with mocks applied
    vi.resetModules();

    // 2. Re-initialize tracker for this test run
    readyDispatchTracker = { events: [] };

    // 3. Setup timers and DOM
    timersControl = useCanonicalTimers();
    createTimerNodes();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;

    // 4. Import test utilities after reset
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
  });

  afterEach(() => {
    readyDispatchTracker.events.length = 0;
    delete window.__NEXT_ROUND_COOLDOWN_MS;
    try {
      timersControl?.cleanup?.();
    } catch {}
  });

  it("debug: check if ready is dispatched", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const { dispatchBattleEvent, resetDispatchHistory } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );

    const store = { selectionMade: false, playerChoice: null };

    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    // Clear previous event calls AND deduplication history before the interrupt flow
    vi.clearAllMocks();
    readyDispatchTracker.events.length = 0;
    resetDispatchHistory("ready"); // Clear deduplication state for ready events

    await machine.dispatch("interrupt");

    // Wait for cooldown entry to be observed
    await vi.waitFor(
      () => {
        const state = machine.getState();
        const cooldownEntered = window.__cooldownEnterInvoked === true || state === "cooldown";
        expect(cooldownEntered).toBe(true);
      },
      { timeout: 1000, interval: 50 }
    );

    // Clear mocks before checking for ready dispatch after cooldown
    vi.clearAllMocks();

    // Advance timers to trigger cooldown expiration (cooldown is ~3 seconds + buffer)
    vi.advanceTimersByTime(4000);
    // Allow any microtasks to complete
    await Promise.resolve();
    await Promise.resolve();

    // Verify that ready event was dispatched after interrupt
    const readyEvents = dispatchBattleEvent.mock.calls.filter(
      ([eventName]) => eventName === "ready"
    );

    // If no ready events, the cooldown timer didn't trigger or cooldownEnter wasn't called
    // This indicates a bug in the state machine onEnter handler execution
    expect(readyEvents.length).toBeGreaterThan(0);
  }, 3000); // Reasonable timeout
});
