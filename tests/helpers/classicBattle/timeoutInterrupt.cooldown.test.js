import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createTimerNodes } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

// Reset modules once at module load to ensure mocks apply to dynamic imports
vi.resetModules();

const readyDispatchTracker = vi.hoisted(() => ({ events: [] }));
let timersControl = null;

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dispatchBattleEvent: vi.fn(async (...args) => {
      const [eventName] = args;
      if (eventName === "ready") {
        const callNumber = readyDispatchTracker.events.length + 1;
        console.log(`[DISPATCH #${callNumber}] ready event`);
        console.trace(`[DISPATCH #${callNumber}] ready stack trace`);
        readyDispatchTracker.events.push(args);
      }
      const result = await actual.dispatchBattleEvent(...args);
      if (eventName === "ready") {
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
            // Use vi.advanceTimersByTime since we're in fake timer environment
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

vi.mock("../../../src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: () => {
    const handlers = { tick: new Set(), expired: new Set() };
    const timer = {
      on: vi.fn((evt, fn) => {
        const timerIndex = globalThis.__MOCK_TIMERS?.length ?? 0;
        console.log(`[TIMER ${timerIndex}] on("${evt}") - handler ${fn.name || "anonymous"}`);
        handlers[evt]?.add(fn);
      }),
      off: vi.fn((evt, fn) => {
        handlers[evt]?.delete(fn);
      }),
      start: vi.fn(() => {
        const timerIndex = globalThis.__MOCK_TIMERS?.indexOf(timer) ?? -1;
        console.log(`[TIMER ${timerIndex}] start() called, scheduling expiration in 1000ms`);
        // Schedule expiration after 1 second using fake timers
        const timeoutId = setTimeout(() => {
          console.log(`[TIMER ${timerIndex}] expired, calling ${handlers.expired.size} handlers`);
          handlers.expired.forEach((fn) => fn());
        }, 1000);
        // Store timeout ID so we can clear it when stop() is called
        timer._timeoutId = timeoutId;
      }),
      stop: vi.fn(() => {
        const timerIndex = globalThis.__MOCK_TIMERS?.indexOf(timer) ?? -1;
        console.log(`[TIMER ${timerIndex}] stop() called, clearing timeout`);
        // Clear the scheduled expiration WITHOUT calling handlers
        // (matching real implementation - stop() does not emit "expired")
        if (timer._timeoutId !== null && timer._timeoutId !== undefined) {
          clearTimeout(timer._timeoutId);
          timer._timeoutId = null;
        }
      }),
      pause: vi.fn(),
      resume: vi.fn()
    };
    // Track timer creation for debugging
    if (typeof globalThis !== "undefined") {
      if (!globalThis.__MOCK_TIMERS) globalThis.__MOCK_TIMERS = [];
      globalThis.__MOCK_TIMERS.push(timer);
      const timerNum = globalThis.__MOCK_TIMERS.length - 1;
      console.log(`[TIMER] Created timer #${timerNum}`);
      if (timerNum === 10 || timerNum === 11 || timerNum === 12) {
        console.log(`[TIMER #${timerNum} CREATED] Stack trace:`);
        console.trace();
      }
    }
    return timer;
  }
}));

describe("timeout → interruptRound → cooldown auto-advance", () => {
  setupClassicBattleHooks();

  beforeEach(async () => {
    // Clear timer tracking
    if (globalThis.__MOCK_TIMERS) {
      globalThis.__MOCK_TIMERS.length = 0;
    }
    // CRITICAL: Clear any pending timers from previous test iterations
    // This ensures we start with a clean fake timer queue
    vi.clearAllTimers();

    // Ensure fake timers are active so vi.advanceTimersByTimeAsync works
    // (many other tests in this suite call vi.useFakeTimers()).
    timersControl = useCanonicalTimers();
    readyDispatchTracker.events.length = 0;
    createTimerNodes();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });

    // CRITICAL: Clear timers again after init, in case initClassicBattleTest created any
    console.log(`[TEST SETUP DEBUG] Clearing timers after initClassicBattleTest`);
    vi.clearAllTimers();
    if (globalThis.__MOCK_TIMERS) {
      console.log(
        `[TEST SETUP DEBUG] __MOCK_TIMERS has ${globalThis.__MOCK_TIMERS.length} items, clearing array`
      );
      globalThis.__MOCK_TIMERS.length = 0;
    }
  });

  afterEach(() => {
    readyDispatchTracker.events.length = 0;
    delete window.__NEXT_ROUND_COOLDOWN_MS;
    try {
      timersControl?.cleanup?.();
    } catch {}
  });

  it("advances from cooldown after interrupt with 1s auto-advance", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const expirationHandlersModule = await import(
      "../../../src/helpers/classicBattle/nextRound/expirationHandlers.js"
    );
    const dispatchReadyDirectSpy = vi.spyOn(expirationHandlersModule, "dispatchReadyDirectly");
    const { onBattleEvent, offBattleEvent } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    const transitions = [];
    const recordTransition = (event) => {
      if (event?.detail) transitions.push(event.detail);
    };
    onBattleEvent("battleStateChange", recordTransition);

    try {
      await machine.dispatch("matchStart");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      // Track how many timers exist before interrupt
      const timersBeforeInterrupt = globalThis.__MOCK_TIMERS?.length ?? 0;
      console.log(`[TEST DEBUG] timersBeforeInterrupt=${timersBeforeInterrupt}`);

      // Clear all pending timers to prevent interference
      // First, stop all currently tracked timers to clear their scheduled callbacks
      if (globalThis.__MOCK_TIMERS) {
        console.log(`[TEST DEBUG] Found ${globalThis.__MOCK_TIMERS.length} timers to stop`);
        for (let i = 0; i < globalThis.__MOCK_TIMERS.length; i++) {
          const timer = globalThis.__MOCK_TIMERS[i];
          if (timer && typeof timer.stop === "function") {
            try {
              console.log(`[TEST] Stopping Timer #${i} before interrupt`);
              timer.stop();
            } catch {
              // ignore
            }
          }
        }
      } else {
        console.log(`[TEST DEBUG] No timers array found`);
      }
      // Also clear Vitest's fake timer queue
      vi.clearAllTimers();

      await machine.dispatch("interruptRound");
      const { dispatchBattleEvent } = await import(
        "../../../src/helpers/classicBattle/eventDispatcher.js"
      );

      // Verify a new timer was created for cooldown
      expect(globalThis.__MOCK_TIMERS).toBeDefined();
      const timersAfterInterrupt = globalThis.__MOCK_TIMERS.length;
      expect(timersAfterInterrupt).toBeGreaterThan(timersBeforeInterrupt);
      console.log(`[TEST] Timers: before=${timersBeforeInterrupt}, after=${timersAfterInterrupt}`);

      // Get the cooldown timer (last one created)
      const cooldownTimer = globalThis.__MOCK_TIMERS[timersAfterInterrupt - 1];
      expect(cooldownTimer.start).toHaveBeenCalled();

      const readyCallsBeforeAdvance = dispatchBattleEvent.mock.calls.filter(
        ([eventName]) => eventName === "ready"
      );
      expect(readyCallsBeforeAdvance).toHaveLength(0);

      const transitionCheckpoint = transitions.length;

      // Use runOnlyPendingTimersAsync to avoid cascading timer creation
      await vi.runOnlyPendingTimersAsync();
      const readyCallsAfterAdvance = dispatchBattleEvent.mock.calls.filter(
        ([eventName]) => eventName === "ready"
      );
      const readyDispatchesDuringAdvance =
        readyCallsAfterAdvance.length - readyCallsBeforeAdvance.length;
      expect(readyDispatchesDuringAdvance).toBe(1);
      expect(readyCallsAfterAdvance).toHaveLength(1);
      // Ensure no additional ready dispatches occur after flushing remaining timers
      await vi.runOnlyPendingTimersAsync();
      const readyCallsAfterFlushing = dispatchBattleEvent.mock.calls.filter(
        ([eventName]) => eventName === "ready"
      );
      expect(readyCallsAfterFlushing).toEqual(readyDispatchTracker.events);
      expect(readyDispatchTracker.events.length).toBe(1);
      expect(readyDispatchTracker.events[0]?.[0]).toBe("ready");
      const readyDirectResults = await Promise.all(
        dispatchReadyDirectSpy.mock.results.map(({ value }) => Promise.resolve(value))
      );
      const dedupeHandled = readyDirectResults.some(
        (result) => result && typeof result === "object" && result.dedupeTracked === true
      );
      expect(dedupeHandled).toBe(true);

      const interruptTransitions = transitions.slice(
        Math.max(0, transitionCheckpoint - 2),
        transitionCheckpoint
      );
      expect(interruptTransitions).toEqual([
        expect.objectContaining({
          from: "waitingForPlayerAction",
          to: "interruptRound",
          event: "interruptRound"
        }),
        expect.objectContaining({ from: "interruptRound", to: "cooldown", event: "restartRound" })
      ]);

      const recentTransitions = transitions.slice(transitionCheckpoint);
      expect(recentTransitions).toEqual([
        expect.objectContaining({ from: "cooldown", to: "roundStart", event: "ready" }),
        expect.objectContaining({
          from: "roundStart",
          to: "waitingForPlayerAction",
          event: "cardsRevealed"
        })
      ]);

      const readyTransitionsAfterAdvance = recentTransitions.filter((t) => t.event === "ready");
      expect(readyTransitionsAfterAdvance).toHaveLength(1);

      const { getStateSnapshot } = await import(
        "../../../src/helpers/classicBattle/battleDebug.js"
      );
      const snapshot = getStateSnapshot();

      expect(snapshot?.state).toBe("waitingForPlayerAction");
    } finally {
      offBattleEvent("battleStateChange", recordTransition);
    }
  }, 10000);
});
