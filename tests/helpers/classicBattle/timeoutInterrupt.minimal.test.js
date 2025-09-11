import { describe, it, expect, vi, beforeEach } from "vitest";

vi.useFakeTimers();

let battleMod;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  
  // Import battleMod after mocks
  const { initClassicBattleTest } = await import("./initClassicBattle.js");
  battleMod = await initClassicBattleTest({ afterMock: true });
});

describe("timeout → interruptRound → cooldown auto-advance - minimal", () => {
  it("can import and initialize battle test environment", async () => {
    expect(battleMod).toBeDefined();
    expect(typeof battleMod.getRoundTimeoutPromise).toBe("function");
    expect(typeof battleMod.getCountdownStartedPromise).toBe("function");
  });

  it("can get promises without hanging", async () => {
    const timeoutPromise = battleMod.getRoundTimeoutPromise();
    const countdownPromise = battleMod.getCountdownStartedPromise();
    
    expect(timeoutPromise).toBeInstanceOf(Promise);
    expect(countdownPromise).toBeInstanceOf(Promise);
  });
});
