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
    
    // Spy on cooldownEnter to verify it's called
    const { cooldownEnter } = await import(
      "../../../src/helpers/classicBattle/stateHandlers/cooldownEnter.js"
    );
    const cooldownEnterSpy = vi.fn(cooldownEnter);
    
    const store = { selectionMade: false, playerChoice: null };

    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();
    
    // Replace the cooldown handler with our spy
    const originalOnEnterMap = machine.context?.onEnterMap;
    if (originalOnEnterMap) {
      originalOnEnterMap.cooldown = cooldownEnterSpy;
    }

    await machine.dispatch("matchStart");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    // Clear previous event calls
    dispatchBattleEvent.mock.calls.length = 0;
    readyDispatchTracker.events.length = 0;
    cooldownEnterSpy.mockClear();

    await machine.dispatch("interruptRound");

    // Wait for cooldown state
    await vi.waitFor(
      () => {
        const state = machine.getState();
        expect(state).toBe("cooldown");
      },
      { timeout: 1000 }
    );

    // At this point, cooldownEnter should have been called and timer should be set up
    // Run all timers to complete the cooldown
    await vi.runAllTimersAsync();

    const readyCallsAfterAdvance = dispatchBattleEvent.mock.calls.filter(
      ([eventName]) => eventName === "ready"
    );

    // Track debug info for diagnostics
    void {
      readyCallsAfterAdvance: readyCallsAfterAdvance.length,
      readyDispatchedViaTracker: readyDispatchTracker.events.length,
      totalCalls: dispatchBattleEvent.mock.calls.length,
      lastCalls: dispatchBattleEvent.mock.calls.slice(-5).map((c) => c[0]),
      cooldownEnterCalled: window.__cooldownEnterInvoked,
      startCooldownCalled: window.__startCooldownInvoked,
      cooldownEnterSpyCalls: cooldownEnterSpy.mock.calls.length
    };

    // First verify cooldownEnter was actually called
    expect(cooldownEnterSpy).toHaveBeenCalled();
    
    expect(readyCallsAfterAdvance.length).toBeGreaterThan(0);
    expect(readyDispatchTracker.events.length).toBe(readyCallsAfterAdvance.length);
  }, 5000);
});
