import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const countdownTimers = [];
const countdownTickEvents = [];
const pendingTickResolvers = [];
const activeCountdownTimeouts = new Set();
let timersControl = null;
let battleMod = null;

function waitForNextCountdownTick() {
  return new Promise((resolve) => {
    pendingTickResolvers.push(resolve);
  });
}

function recordCountdownTick(event) {
  countdownTickEvents.push(event);
  while (pendingTickResolvers.length) {
    const resolve = pendingTickResolvers.shift();
    resolve(event);
  }
}

function resetCountdownState() {
  countdownTimers.length = 0;
  countdownTickEvents.length = 0;
  pendingTickResolvers.length = 0;
  activeCountdownTimeouts.clear();
}

// Mock timer modules the same way as the original test
vi.mock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDefaultTimer: vi.fn(async () => 1),
    createCountdownTimer: vi.fn(() => {
      let tickHandler = null;
      let timeoutId = null;
      const controls = {
        on: vi.fn((event, handler) => {
          if (event === "tick") {
            tickHandler = handler;
          }
        }),
        start: vi.fn(() => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            activeCountdownTimeouts.delete(timeoutId);
          }
          timeoutId = setTimeout(() => {
            activeCountdownTimeouts.delete(timeoutId);
            timeoutId = null;
            if (tickHandler) {
              tickHandler(0);
            }
            recordCountdownTick({ timer: controls, remaining: 0 });
          }, 1000);
          activeCountdownTimeouts.add(timeoutId);
        }),
        stop: vi.fn(() => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            activeCountdownTimeouts.delete(timeoutId);
            timeoutId = null;
          }
        }),
        pause: vi.fn(() => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            activeCountdownTimeouts.delete(timeoutId);
            timeoutId = null;
          }
        }),
        resume: vi.fn()
      };
      countdownTimers.push(controls);
      return controls;
    })
  };
});

vi.mock("../../../src/helpers/timers/createRoundTimer.js", async () => {
  const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
  // Schedule expiry after 1s, no ticks
  mockCreateRoundTimer({
    scheduled: true,
    ticks: [],
    intervalMs: 1000,
    moduleId: "../../../src/helpers/timers/createRoundTimer.js"
  });
  return await import("../../../src/helpers/timers/createRoundTimer.js");
});

beforeEach(async () => {
  timersControl = vi.useFakeTimers();
  resetCountdownState();
  vi.resetModules();
  vi.clearAllMocks();

  // Import battleMod after mocks
  const { initClassicBattleTest } = await import("./initClassicBattle.js");
  battleMod = await initClassicBattleTest({ afterMock: true });
});

afterEach(() => {
  try {
    timersControl?.clearAllTimers?.();
  } catch {}
  timersControl?.useRealTimers?.();
  timersControl = null;
  battleMod = null;
  vi.useRealTimers();
});

describe("timer behavior with mocks", () => {
  it("can advance timers without hanging", async () => {
    const timerUtils = await import("../../../src/helpers/timerUtils.js");
    const tickSpy = vi.fn();
    const timer = timerUtils.createCountdownTimer(1);
    timer.on("tick", tickSpy);

    expect(countdownTimers.length).toBeGreaterThan(0);

    const tickPromise = waitForNextCountdownTick();

    timer.start();

    await vi.advanceTimersByTimeAsync(1000);

    const { timer: tickedTimer } = await tickPromise;

    expect(tickSpy).toHaveBeenCalledTimes(1);
    expect(tickedTimer).toBe(timer);
    expect(countdownTickEvents.length).toBeGreaterThan(0);
    expect(activeCountdownTimeouts.size).toBe(0);
  });

  it("binds orchestrator state and readiness hooks", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const store = { selectionMade: false, playerChoice: null };
    const machine = await initClassicBattleOrchestrator(store, undefined, {});

    expect(machine).toBeDefined();
    expect(machine.getState()).toBe("waitingForMatchStart");
    expect(getBattleStateMachine()).toBe(machine);

    expect(store.context?.store).toBe(store);
    expect(typeof store.context?.doResetGame).toBe("function");
    expect(typeof store.context?.doStartRound).toBe("function");

    expect(document.body.dataset.battleState).toBe(machine.getState());
    expect(typeof window.getBattleStateSnapshot).toBe("function");
    expect(window.getBattleStateSnapshot()?.state).toBe(machine.getState());

    const countdownPromise = battleMod?.getCountdownStartedPromise();
    expect(countdownPromise).toBeInstanceOf(Promise);
    expect(window.countdownStartedPromise).toBe(countdownPromise);
    expect(window.roundPromptPromise).toBeInstanceOf(Promise);
  }, 5000);
});
