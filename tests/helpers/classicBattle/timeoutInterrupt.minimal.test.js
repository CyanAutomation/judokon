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
      if (eventName === "ready") {
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

describe("timeout → interruptRound → minimal auto-advance", () => {
  setupClassicBattleHooks();

  beforeEach(async () => {
    // Ensure fake timers are active so vi.advanceTimersByTimeAsync works
    // (many other tests in this suite call vi.useFakeTimers()).
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

  it("dispatches ready event after timeout interrupt cooldown", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
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

      await machine.dispatch("interruptRound");

      const { dispatchBattleEvent } = await import(
        "../../../src/helpers/classicBattle/eventDispatcher.js"
      );
      const readyCallsBeforeAdvance = dispatchBattleEvent.mock.calls.filter(
        ([eventName]) => eventName === "ready"
      );
      expect(readyCallsBeforeAdvance).toHaveLength(0);

      const transitionCheckpoint = transitions.length;

      await vi.advanceTimersByTimeAsync(1000);

      const readyCallsAfterAdvance = dispatchBattleEvent.mock.calls.filter(
        ([eventName]) => eventName === "ready"
      );
      expect(readyCallsAfterAdvance).toHaveLength(1);
      expect(readyDispatchTracker.events).toHaveLength(1);
      expect(readyDispatchTracker.events[0]).toEqual(["ready"]);

      await vi.runOnlyPendingTimersAsync();

      const recentTransitions = transitions.slice(transitionCheckpoint);
      expect(recentTransitions).toEqual([
        expect.objectContaining({ from: "cooldown", to: "roundStart", event: "ready" }),
        expect.objectContaining({
          from: "roundStart",
          to: "waitingForPlayerAction",
          event: "cardsRevealed"
        })
      ]);
    } finally {
      offBattleEvent("battleStateChange", recordTransition);
    }
  }, 5000);
});
