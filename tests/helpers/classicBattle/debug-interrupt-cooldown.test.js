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

vi.mock("../../../src/helpers/timers/createRoundTimer.js", async () => {
  const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
  mockCreateRoundTimer({
    scheduled: true, // Use scheduled mode with fake timers
    intervalMs: 1000,
    tickCount: 1,
    ticks: [1, 0],
    expire: true,
    moduleId: "../../../src/helpers/timers/createRoundTimer.js"
  });
  return await import("../../../src/helpers/timers/createRoundTimer.js");
});

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
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );

    const store = { selectionMade: false, playerChoice: null };

    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    // Clear previous event calls before the interrupt flow
    vi.clearAllMocks();
    readyDispatchTracker.events.length = 0;

    await machine.dispatch("interrupt");

    // Wait for cooldown state to be entered
    await vi.waitFor(
      () => {
        expect(machine.getState()).toBe("cooldown");
      },
      { timeout: 1000 }
    );

    // Run all pending timers to complete the cooldown cycle
    await vi.runAllTimersAsync();

    // Verify that ready event was dispatched
    const readyEvents = dispatchBattleEvent.mock.calls.filter(
      ([eventName]) => eventName === "ready"
    );

    // If no ready events, the cooldown timer didn't trigger or cooldownEnter wasn't called
    // This indicates a bug in the state machine onEnter handler execution
    expect(readyEvents.length).toBeGreaterThan(0);
  }, 5000);
});
