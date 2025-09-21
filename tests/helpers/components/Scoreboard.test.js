import { describe, it, expect } from "vitest";
import { createScoreboard } from "./Scoreboard.js";

describe("createScoreboard", () => {
  it("creates a scoreboard with proper DOM structure", () => {
    const scoreboard = createScoreboard();

    expect(scoreboard.element.tagName).toBe("DIV");
    expect(scoreboard.element.children).toHaveLength(4);

    const messageEl = scoreboard.element.querySelector("#round-message");
    const timerEl = scoreboard.element.querySelector("#next-round-timer");
    const scoreEl = scoreboard.element.querySelector("#score-display");
    const roundEl = scoreboard.element.querySelector("#round-counter");

    expect(messageEl).toBeTruthy();
    expect(messageEl.getAttribute("aria-live")).toBe("polite");
    expect(messageEl.getAttribute("data-testid")).toBe("round-message");

    expect(timerEl).toBeTruthy();
    expect(timerEl.getAttribute("aria-live")).toBe("polite");
    expect(timerEl.getAttribute("data-testid")).toBe("next-round-timer");

    expect(scoreEl).toBeTruthy();
    expect(scoreEl.getAttribute("aria-live")).toBe("polite");
    expect(scoreEl.getAttribute("data-testid")).toBe("score-display");

    expect(roundEl).toBeTruthy();
    expect(roundEl.getAttribute("aria-live")).toBe("polite");
    expect(roundEl.getAttribute("data-testid")).toBe("round-counter");
  });

  it("uses provided container element", () => {
    const container = document.createElement("section");
    container.id = "custom-container";
    const scoreboard = createScoreboard(container);

    expect(scoreboard.element).toBe(container);
    expect(scoreboard.element.id).toBe("custom-container");
    expect(scoreboard.element.children).toHaveLength(4);
  });

  it("provides model and view instances", () => {
    const scoreboard = createScoreboard();

    expect(scoreboard.model).toBeDefined();
    expect(scoreboard.view).toBeDefined();
    expect(typeof scoreboard.model.getScore).toBe("function");
    expect(typeof scoreboard.view.render).toBe("function");
  });

  it("renders state changes", () => {
    const scoreboard = createScoreboard();

    scoreboard.render({
      message: { text: "Round started!" },
      timerSeconds: 30,
      score: { player: 2, opponent: 1 },
      roundNumber: 3
    });

    const messageEl = scoreboard.element.querySelector("#round-message");
    const timerEl = scoreboard.element.querySelector("#next-round-timer");
    const scoreEl = scoreboard.element.querySelector("#score-display");
    const roundEl = scoreboard.element.querySelector("#round-counter");

    expect(messageEl.textContent).toBe("Round started!");
    expect(timerEl.textContent).toBe("Time Left: 30s");
    expect(scoreEl.textContent).toContain("You: 2");
    expect(scoreEl.textContent).toContain("Opponent: 1");
    expect(roundEl.textContent).toBe("Round 3");
  });

  it("provides helper methods for common updates", () => {
    const scoreboard = createScoreboard();

    scoreboard.updateScore({ player: 5, opponent: 3 });
    expect(scoreboard.getScore()).toEqual({ player: 5, opponent: 3 });

    scoreboard.updateTimer(45);
    expect(scoreboard.getTimer()).toBe(45);

    scoreboard.updateMessage("New round!");
    expect(scoreboard.getMessage()).toEqual({ text: "New round!" });

    scoreboard.updateRound(2);
    expect(scoreboard.getRound()).toBe(2);
  });

  it("provides getter methods for current state", () => {
    const scoreboard = createScoreboard();

    expect(scoreboard.getScore()).toEqual({ player: 0, opponent: 0 });
    expect(scoreboard.getTimer()).toBe(0);
    expect(scoreboard.getMessage()).toBeNull();
    expect(scoreboard.getRound()).toBe(0);
  });
});
