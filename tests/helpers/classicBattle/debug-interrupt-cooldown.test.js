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
    scheduled: false,
    ticks: [],
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

    console.log("[TEST] Initializing orchestrator");
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    console.log("[TEST] Dispatching matchStart");
    await machine.dispatch("matchStart");

    console.log("[TEST] Dispatching ready (for match)");
    await machine.dispatch("ready");

    console.log("[TEST] Dispatching ready (to cooldown)");
    await machine.dispatch("ready");

    console.log("[TEST] Dispatching cardsRevealed");
    await machine.dispatch("cardsRevealed");

    console.log("[TEST] Dispatching interruptRound");
    await machine.dispatch("interruptRound");

    const readyCallsBeforeAdvance = dispatchBattleEvent.mock.calls.filter(
      ([eventName]) => eventName === "ready"
    );
    console.log("[TEST] readyCallsBeforeAdvance:", readyCallsBeforeAdvance.length);

    await vi.advanceTimersByTimeAsync(1000);

    const readyCallsAfterAdvance = dispatchBattleEvent.mock.calls.filter(
      ([eventName]) => eventName === "ready"
    );

    // Track debug info for diagnostics
    void {
      readyCallsAfterAdvance: readyCallsAfterAdvance.length,
      readyDispatchedViaTracker: readyDispatchTracker.events.length,
      totalCalls: dispatchBattleEvent.mock.calls.length,
      lastCalls: dispatchBattleEvent.mock.calls.slice(-5).map((c) => c[0])
    };

    expect(readyCallsAfterAdvance.length).toBeGreaterThan(0);
    expect(readyDispatchTracker.events.length).toBe(readyCallsAfterAdvance.length);
  }, 5000);
});
