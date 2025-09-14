import { describe, it, beforeEach, expect } from "vitest";

import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";
import { setScheduler } from "../../src/helpers/scheduler.js";

describe("battleScoreboard PRD adapter", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = document.createElement("header");
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
    `;
    container.appendChild(header);
    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);
    const mock = await import("./mockScheduler.js");
    setScheduler(mock.createMockScheduler());
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();
  });

  afterEach(() => {
    clearBody();
  });

  it("updates round counter and scores from PRD events", async () => {
    emitBattleEvent("round.started", { roundIndex: 3 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");

    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 4, opponent: 2 }
    });

    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 4");
    expect(scoreText).toContain("Opponent: 2");
  });

  it("disposes listeners and stops updating", async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    emitBattleEvent("round.evaluated", { scores: { player: 1, opponent: 0 } });
    disposeBattleScoreboardAdapter();
    emitBattleEvent("round.evaluated", { scores: { player: 2, opponent: 2 } });

    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 1");
    expect(scoreText).toContain("Opponent: 0");
  });
});
