import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
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
