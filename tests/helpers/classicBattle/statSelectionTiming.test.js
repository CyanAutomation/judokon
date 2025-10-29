import { describe, it, expect, beforeEach, vi } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";
import { stallRecoveryJudokaFixtures } from "./stallRecoveryJudokaFixtures.js";
import { renderStatsMarkup } from "./utils.js";

const [playerFixture, opponentFixture] = stallRecoveryJudokaFixtures;

describe("classicBattle stat selection timing", () => {
  const getEnv = setupClassicBattleHooks();

  function readScoreValues() {
    const player = document.querySelector(
      'header #score-display [data-side="player"] [data-part="value"]'
    );
    const opponent = document.querySelector(
      'header #score-display [data-side="opponent"] [data-part="value"]'
    );
    return {
      player: player ? player.textContent : null,
      opponent: opponent ? opponent.textContent : null
    };
  }

  beforeEach(() => {
    try {
      if (typeof window !== "undefined" && window.__disableSnackbars)
        delete window.__disableSnackbars;
    } catch {}
    document.body.innerHTML = `
      <header>
        <p id="round-message"></p>
        <p id="next-round-timer">
          <span data-part="label">Time Left:</span>
          <span data-part="value">0s</span>
        </p>
        <p id="round-counter"></p>
        <p id="score-display">
          <span data-side="player">
            <span data-part="label">You:</span>
            <span data-part="value">0</span>
          </span>
          <span data-side="opponent">
            <span data-part="label">Opponent:</span>
            <span data-part="value">0</span>
          </span>
        </p>
      </header>
      <div id="player-card"></div>
      <div id="opponent-card"></div>
    `;
  });

  it("auto-selects a stat when timer expires", async () => {
    const { timerSpy } = getEnv();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    store.currentPlayerJudoka = playerFixture;
    store.currentOpponentJudoka = opponentFixture;
    store.lastPlayerStats = { ...playerFixture.stats };
    store.lastOpponentStats = { ...opponentFixture.stats };
    document.getElementById("player-card").innerHTML = renderStatsMarkup(playerFixture.stats);
    document.getElementById("opponent-card").innerHTML = renderStatsMarkup(opponentFixture.stats);
    const pending = battleMod.__triggerRoundTimeoutNow(store);
    await timerSpy.runAllTimersAsync();
    await pending;
    const msg = document.querySelector("header #round-message").textContent;
    expect(readScoreValues()).toEqual({ player: "1", opponent: "0" });
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
    document.getElementById("player-card").innerHTML = renderStatsMarkup(playerFixture.stats);
    document.getElementById("opponent-card").innerHTML = renderStatsMarkup(opponentFixture.stats);
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
