import { describe, it, beforeEach, afterEach, expect } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

describe("battleScoreboard authority + persistence", () => {
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

  it("persists outcome until control.state.changed to selection/cooldown", async () => {
    const header = document.querySelector("header");
    // Evaluate round → outcome set
    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 2, opponent: 0 },
      message: "You win"
    });
    expect(header.dataset.outcome).toBe("playerWin");

    // Timer tick should not clear
    emitBattleEvent("round.timer.tick", { remainingMs: 4000 });
    expect(header.dataset.outcome).toBe("playerWin");

    // Transition to unrelated state should not clear
    emitBattleEvent("control.state.changed", { to: "roundResolve" });
    expect(header.dataset.outcome).toBe("playerWin");

    // Selection clears outcome
    emitBattleEvent("control.state.changed", { to: "selection" });
    expect(header.dataset.outcome).toBe("none");
    expect(document.getElementById("round-message").textContent).toBe("");

    // New outcome after selection
    emitBattleEvent("round.evaluated", {
      outcome: "winOpponent",
      scores: { player: 2, opponent: 1 },
      message: "Opponent wins"
    });
    expect(header.dataset.outcome).toBe("opponentWin");

    // Cooldown also clears
    emitBattleEvent("control.state.changed", { to: "roundWait" });
    expect(header.dataset.outcome).toBe("none");
  });

  it("does not replay legacy evaluation without round identity on roundDisplay", async () => {
    const header = document.querySelector("header");
    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 2, opponent: 0 },
      message: "Legacy"
    });
    expect(header.dataset.outcome).toBe("playerWin");

    emitBattleEvent("control.state.changed", {
      to: "selection",
      context: { roundIndex: 6 }
    });
    expect(header.dataset.outcome).toBe("none");

    emitBattleEvent("control.state.changed", {
      to: "roundDisplay",
      context: { roundIndex: 6 }
    });
    expect(header.dataset.outcome).toBe("none");
  });

  it("ignores events safely after disposal", async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    disposeBattleScoreboardAdapter();

    expect(() => {
      emitBattleEvent("round.evaluated", {
        outcome: "winPlayer",
        message: "No crash"
      });
      emitBattleEvent("control.state.changed", { to: "roundDisplay" });
    }).not.toThrow();
  });
});
