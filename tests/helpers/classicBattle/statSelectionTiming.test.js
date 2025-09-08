import { describe, it, expect, beforeEach, vi } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

describe("classicBattle stat selection timing", () => {
  const getEnv = setupClassicBattleHooks();

  beforeEach(() => {
    try {
      if (typeof window !== "undefined" && window.__disableSnackbars)
        delete window.__disableSnackbars;
    } catch {}
  });

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

  it("shows selection prompt until a stat is chosen", async () => {
    const { timerSpy } = getEnv();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    expect(document.querySelector(".snackbar").textContent).toBe("Select your move");
    timerSpy.advanceTimersByTime(5000);
    expect(document.querySelector(".snackbar").textContent).toBe(
      "Stat selection stalled. Pick a stat or wait for auto-pick."
    );
    expect(document.querySelector("header #round-message").textContent).toBe("");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    {
      const playerVal = battleMod.getCardStatValue(document.getElementById("player-card"), "power");
      const opponentVal = battleMod.getCardStatValue(
        document.getElementById("opponent-card"),
        "power"
      );
      const p = battleMod.handleStatSelection(store, "power", {
        playerVal,
        opponentVal
      });
      await timerSpy.runAllTimersAsync();
      await p;
    }
    expect(document.querySelector(".snackbar")?.textContent).not.toBe("Select your move");
  });
});
