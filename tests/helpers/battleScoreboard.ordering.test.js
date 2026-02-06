import { describe, it, beforeEach, afterEach, expect } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";
import { createDiv } from "../helpers/domFactory.js";

describe("battleScoreboard out-of-order guards", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = createDiv({ className: "battle-header" });
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="off" aria-atomic="true">
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

  it("reaches the same rendered state when control.state.changed arrives before round.evaluated", async () => {
    emitBattleEvent("control.state.changed", {
      to: "roundDisplay",
      context: { roundIndex: 5 },
      roundIndex: 5
    });
    emitBattleEvent("round.evaluated", {
      roundIndex: 5,
      outcome: "winPlayer",
      message: "You win round 5",
      scores: { player: 3, opponent: 1 }
    });

    const header = document.querySelector(".battle-header");
    const message = document.getElementById("round-message").textContent;
    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();

    expect(header.dataset.outcome).toBe("playerWin");
    expect(message).toBe("You win round 5");
    expect(scoreText).toContain("You: 3");
    expect(scoreText).toContain("Opponent: 1");
  });

  it("reaches the same rendered state when round.evaluated arrives before control.state.changed", async () => {
    emitBattleEvent("round.evaluated", {
      roundIndex: 5,
      outcome: "winPlayer",
      message: "You win round 5",
      scores: { player: 3, opponent: 1 }
    });
    emitBattleEvent("control.state.changed", {
      to: "roundDisplay",
      context: { roundIndex: 5 },
      roundIndex: 5
    });

    const header = document.querySelector(".battle-header");
    const message = document.getElementById("round-message").textContent;
    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();

    expect(header.dataset.outcome).toBe("playerWin");
    expect(message).toBe("You win round 5");
    expect(scoreText).toContain("You: 3");
    expect(scoreText).toContain("Opponent: 1");
  });

  it("ignores stale round.evaluated payloads after newer authoritative state is active", async () => {
    emitBattleEvent("control.state.changed", {
      to: "roundDisplay",
      context: { roundIndex: 7 },
      roundIndex: 7
    });

    emitBattleEvent("round.evaluated", {
      roundIndex: 6,
      outcome: "winOpponent",
      message: "Stale round 6",
      scores: { player: 0, opponent: 1 }
    });

    const header = document.querySelector(".battle-header");
    const message = document.getElementById("round-message").textContent;
    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();

    expect(header.dataset.outcome || "none").toBe("none");
    expect(message).toBe("");
    expect(scoreText).toContain("You: 0");
    expect(scoreText).toContain("Opponent: 0");
  });

  it("ignores older round.started events after a newer one", async () => {
    emitBattleEvent("round.started", { roundIndex: 3 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");
    emitBattleEvent("round.started", { roundIndex: 2 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");
    emitBattleEvent("round.started", { roundIndex: 4 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 4");
  });
});
