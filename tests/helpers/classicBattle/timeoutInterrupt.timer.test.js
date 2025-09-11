import { describe, it, expect, vi, beforeEach } from "vitest";

vi.useFakeTimers();

// Mock timer modules the same way as the original test
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
            // Schedule countdown tick to fire when fake timers advance
            setTimeout(() => tickHandler(1), 1000);
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
  createRoundTimer: vi.fn(() => {
    let expiredHandler = null;
    return {
      on: vi.fn((event, handler) => {
        if (event === "expired") {
          expiredHandler = handler;
        }
      }),
      start: vi.fn(() => {
        if (expiredHandler) {
          // Schedule timer expiry to fire when fake timers advance
          setTimeout(expiredHandler, 1000);
        }
      })
    };
  })
}));

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  
  // Import battleMod after mocks
  const { initClassicBattleTest } = await import("./initClassicBattle.js");
  await initClassicBattleTest({ afterMock: true });
});

describe("timer behavior with mocks", () => {
  it("can advance timers without hanging", async () => {
    await vi.advanceTimersByTimeAsync(100);
    expect(true).toBe(true);
  });

  it("can start orchestrator without hanging", async () => {
    const { initClassicBattleOrchestrator } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    expect(true).toBe(true);
  }, 5000);
});
