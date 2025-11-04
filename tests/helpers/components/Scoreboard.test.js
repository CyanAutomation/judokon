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

  it("updates the DOM via public helpers", () => {
    const scoreboard = createScoreboard();
    document.body.appendChild(scoreboard.element);

    try {
      scoreboard.updateScore({ player: 9, opponent: 4 });
      expect(scoreboard.getScore()).toEqual({ player: 9, opponent: 4 });

      const playerValue = scoreboard.element
        .querySelector('#score-display [data-side="player"] [data-part="value"]')
        ?.textContent;
      const opponentValue = scoreboard.element
        .querySelector('#score-display [data-side="opponent"] [data-part="value"]')
        ?.textContent;

      expect(playerValue).toBe("9");
      expect(opponentValue).toBe("4");

      scoreboard.updateTimer(42);
      const timerEl = scoreboard.element.querySelector("#next-round-timer");
      expect(timerEl?.textContent).toBe("Time Left: 42s");
      expect(timerEl?.getAttribute("data-remaining-time")).toBe("42");

      scoreboard.updateMessage("Fight on!");
      const messageEl = scoreboard.element.querySelector("#round-message");
      expect(messageEl?.textContent).toBe("Fight on!");

      scoreboard.updateRound(3);
      const roundEl = scoreboard.element.querySelector("#round-counter");
      expect(roundEl?.textContent).toBe("Round 3");
    } finally {
      scoreboard.view.destroy();
      scoreboard.element.remove();
    }
  });

  it("provides getter methods for current state", () => {
    const scoreboard = createScoreboard();

    expect(scoreboard.getScore()).toEqual({ player: 0, opponent: 0 });
    // Note: Timer and message state are not stored in the model/view,
    // so getters return null to indicate this limitation
    expect(scoreboard.getTimer()).toBeNull();
    expect(scoreboard.getMessage()).toBeNull();
    expect(scoreboard.getRound()).toBeNull();
  });
});
