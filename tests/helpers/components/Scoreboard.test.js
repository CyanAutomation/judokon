import { describe, it, expect, vi } from "vitest";
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

  it("renders DOM updates via public helpers", async () => {
    const scoreboard = createScoreboard();
    document.body.appendChild(scoreboard.element);

    try {
      const scoreInput = { player: 7, opponent: 5 };
      scoreboard.updateScore(scoreInput);
      scoreboard.updateTimer(18);
      scoreboard.updateMessage("Keep pushing!");
      scoreboard.updateRound(4);

      // Allow any deferred DOM work (e.g., debounce or RAF) to finish.
      await vi.waitFor(
        () => {
          expect(
            scoreboard.element.querySelector('[data-testid="score-display"]')
          ).toBeTruthy();
        },
        { timeout: 100 }
      );

      const scoreDisplay = scoreboard.element.querySelector('[data-testid="score-display"]');
      expect(scoreDisplay).toBeTruthy();
      expect(scoreboard.getScore()).toEqual(scoreInput);
      const playerScoreEl = scoreDisplay.querySelector('[data-testid="player-score-value"]');
      const opponentScoreEl = scoreDisplay.querySelector('[data-testid="opponent-score-value"]');

      expect(playerScoreEl).toBeTruthy();
      expect(opponentScoreEl).toBeTruthy();
      expect(playerScoreEl.textContent).toBe("7");
      expect(opponentScoreEl.textContent).toBe("5");

      const timerEl = scoreboard.element.querySelector("#next-round-timer");
      expect(timerEl).toBeTruthy();
      expect(timerEl.textContent).toBe("Time Left: 18s");
      expect(timerEl.getAttribute("data-remaining-time")).toBe("18");

      const messageEl = scoreboard.element.querySelector("#round-message");
      expect(messageEl).toBeTruthy();
      expect(messageEl.textContent).toBe("Keep pushing!");

      const roundEl = scoreboard.element.querySelector("#round-counter");
      expect(roundEl).toBeTruthy();
      expect(roundEl.textContent).toBe("Round 4");
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
