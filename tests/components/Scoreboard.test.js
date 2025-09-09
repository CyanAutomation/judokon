import { describe, it, expect, vi } from "vitest";
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

  it("ignores partial score patches", () => {
    const model = new ScoreboardModel();
    const messageEl = document.createElement("p");
    const scoreEl = document.createElement("p");
    const view = new ScoreboardView(model, { messageEl, scoreEl });
    const sb = new Scoreboard(model, view);
    sb.render({ score: { player: 0, opponent: 0 } });
    sb.render({ score: { player: 2 } });
    expect(scoreEl.textContent).toContain("You: 0");
    expect(scoreEl.textContent).toContain("Opponent: 0");
  });

  it("locks outcome messages", () => {
    vi.useFakeTimers();
    const model = new ScoreboardModel();
    const messageEl = document.createElement("p");
    const view = new ScoreboardView(model, { messageEl });
    const sb = new Scoreboard(model, view);
    sb.showMessage("Win", { outcome: true });
    sb.showMessage("Waiting...");
    expect(messageEl.textContent).toBe("Win");
    vi.advanceTimersByTime(1000);
    sb.showMessage("Next");
    expect(messageEl.textContent).toBe("Next");
    vi.useRealTimers();
  });
});
