import { describe, it, beforeEach, expect } from "vitest";

import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";

describe("battleScoreboard DOM contract (root data-outcome)", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.className = "battle-header";
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
    `;
    document.body.appendChild(header);
    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
    initScoreboard(header);
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();
  });

  it("sets header data-outcome to enumerated values and clears to none", async () => {
    const header = document.querySelector("header");
    // Round start resets outcome to none
    emitBattleEvent("round.started", { roundIndex: 2 });
    expect(header.dataset.outcome).toBe("none");

    // Round evaluated → player win
    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 1, opponent: 0 },
      message: "You win"
    });
    expect(header.dataset.outcome).toBe("playerWin");
    // Back-compat: message element keeps boolean flag
    expect(document.getElementById("round-message").dataset.outcome).toBe("true");

    // Match concluded → opponent win
    emitBattleEvent("match.concluded", {
      winner: "opponent",
      scores: { player: 1, opponent: 2 },
      reason: "matchWinOpponent",
      message: "Opponent wins"
    });
    expect(header.dataset.outcome).toBe("opponentWin");
    expect(document.getElementById("round-counter").textContent).toBe("");
  });
});
