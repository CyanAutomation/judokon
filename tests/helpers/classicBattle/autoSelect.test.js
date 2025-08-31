import { describe, it, expect, vi } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

describe("classicBattle auto select", () => {
  const getEnv = setupClassicBattleHooks();

  it("auto-selects a stat when timer expires", async () => {
    const { timerSpy } = getEnv();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    const pending = battleMod.__triggerRoundTimeoutNow(store);
    await timerSpy.runAllTimersAsync();
    await pending;
    const score = document.querySelector("header #score-display").textContent;
    const msg = document.querySelector("header #round-message").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
    // Ensure we surfaced the win message; cooldown drift hints must not overwrite it
    expect(msg).toMatch(/win the round/i);
  });

  it("does not auto-select when feature flag disabled", async () => {
    const { timerSpy, currentFlags } = getEnv();
    currentFlags.autoSelect.enabled = false;
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    await timerSpy.advanceTimersByTimeAsync(30000);
    await timerSpy.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).toBe("You: 0\nOpponent: 0");
  });
});
