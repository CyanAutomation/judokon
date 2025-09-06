import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

import { __resetBattleEventTarget, emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";

describe("scoreboardAdapter maps display.* events to Scoreboard", () => {
  beforeEach(async () => {
    vi.resetModules();
    __resetBattleEventTarget();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.innerHTML = `
      <p id=\"round-message\" aria-live=\"polite\" aria-atomic=\"true\" role=\"status\"></p>
      <p id=\"next-round-timer\" aria-live=\"polite\" aria-atomic=\"true\" role=\"status\"></p>
      <p id=\"round-counter\" aria-live=\"polite\" aria-atomic=\"true\"></p>
      <p id=\"score-display\" aria-live=\"polite\" aria-atomic=\"true\"></p>
    `;
    document.body.appendChild(header);
    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
    initScoreboard(undefined);
    const { initScoreboardAdapter } = await import(
      "../../src/helpers/classicBattle/scoreboardAdapter.js"
    );
    initScoreboardAdapter();
  });

  it("updates message, outcome lock, timer, round counter, and score", async () => {
    emitBattleEvent("display.round.start", { roundNumber: 3 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");

    emitBattleEvent("display.round.message", { text: "Fight!" });
    expect(document.getElementById("round-message").textContent).toBe("Fight!");

    emitBattleEvent("display.round.outcome", { text: "You win" });
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("You win");
    expect(msg.dataset.outcome).toBe("true");

    emitBattleEvent("display.timer.show", { secondsRemaining: 5 });
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 5s");
    emitBattleEvent("display.timer.tick", { secondsRemaining: 4 });
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 4s");
    emitBattleEvent("display.timer.hide");
    expect(document.getElementById("next-round-timer").textContent).toBe("");

    emitBattleEvent("display.score.update", { player: 2, opponent: 1 });
    const scoreText = document.getElementById("score-display").textContent.replace(/\s+/g, " ").trim();
    expect(scoreText).toContain("You: 2");
    expect(scoreText).toContain("Opponent: 1");
  });
});

