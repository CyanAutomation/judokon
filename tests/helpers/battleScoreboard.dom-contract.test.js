import { describe, it, beforeEach, afterEach, expect } from "vitest";

import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

describe("battleScoreboard DOM contract (root data-outcome)", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = document.createElement("header");
    header.className = "battle-header";
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true">
        <span data-side="player">
          <span data-part="label">You:</span>
          <span data-part="value">0</span>
        </span>
        <span data-side="opponent">
          <span data-part="label">Opponent:</span>
          <span data-part="value">0</span>
        </span>
      </p>
    `;
    container.appendChild(header);
    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();
  });

  afterEach(() => {
    clearBody();
  });

  it("sets header data-outcome to enumerated values and clears to none", async () => {
    const header = document.querySelector("header");
    emitBattleEvent("round.started", { roundIndex: 2 });

    // Round evaluated → player win
    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 1, opponent: 0 },
      message: "You win"
    });
    expect(header.dataset.outcome).toBe("playerWin");
    // Back-compat: message element keeps boolean flag
    expect(document.getElementById("round-message").dataset.outcome).toBe("true");

    // match.concluded payload alone is non-authoritative (compatibility value path only)
    emitBattleEvent("match.concluded", {
      winner: "opponent",
      scores: { player: 1, opponent: 2 },
      reason: "matchWinOpponent",
      message: "Opponent wins"
    });
    expect(header.dataset.outcome).toBe("playerWin");

    // Authoritative final lock happens on control.state.changed
    emitBattleEvent("control.state.changed", { to: "concluded" });
    expect(header.dataset.outcome).toBe("opponentWin");
    expect(document.getElementById("round-counter").textContent).toBe("");
  });
});
