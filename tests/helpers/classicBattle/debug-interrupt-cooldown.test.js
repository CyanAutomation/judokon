import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createTimerNodes } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

const readyDispatchTracker = vi.hoisted(() => ({ events: [] }));
let timersControl = null;

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dispatchBattleEvent: vi.fn(async (...args) => {
      const [eventName] = args;
      console.log("[MOCK] dispatchBattleEvent called with:", eventName);
      if (eventName === "ready") {
        readyDispatchTracker.events.push(args);
        console.log("[MOCK] Tracked ready event. Total:", readyDispatchTracker.events.length);
      }
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

describe("DEBUG: interrupt cooldown ready dispatch", () => {
  setupClassicBattleHooks();

  beforeEach(async () => {
    timersControl = useCanonicalTimers();
    readyDispatchTracker.events.length = 0;
    createTimerNodes();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;
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

    await machine.dispatch("matchStart");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    // Clear previous event calls before the interrupt flow
    dispatchBattleEvent.mock.calls.length = 0;
    readyDispatchTracker.events.length = 0;

    await machine.dispatch("interruptRound");

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
    expect(readyDispatchTracker.events.length).toBe(readyEvents.length);
  }, 5000);
});
