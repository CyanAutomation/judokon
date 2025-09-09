import { describe, it, expect } from "vitest";
import { Scoreboard } from "../../src/components/Scoreboard.js";
import { ScoreboardModel } from "../../src/components/ScoreboardModel.js";
import { ScoreboardView } from "../../src/components/ScoreboardView.js";

describe("Scoreboard composition", () => {
  it("render delegates to model and view", () => {
    const model = new ScoreboardModel();
    const messageEl = document.createElement("p");
    const timerEl = document.createElement("p");
    const scoreEl = document.createElement("p");
    const roundCounterEl = document.createElement("p");
    const view = new ScoreboardView(model, {
      messageEl,
      timerEl,
      scoreEl,
      roundCounterEl
    });
    const sb = new Scoreboard(model, view);
    sb.render({
      message: { text: "Hi" },
      timerSeconds: 5,
      score: { player: 1, opponent: 2 },
      roundNumber: 3
    });
    expect(messageEl.textContent).toBe("Hi");
    expect(timerEl.textContent).toBe("Time Left: 5s");
    expect(scoreEl.textContent).toContain("You: 1");
    expect(scoreEl.textContent).toContain("Opponent: 2");
    expect(roundCounterEl.textContent).toBe("Round 3");
  });
});
