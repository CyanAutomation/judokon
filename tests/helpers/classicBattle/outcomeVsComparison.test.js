import { describe, expect, it, vi, beforeEach } from "vitest";
import "./commonMocks.js";

// Force synchronous stat comparison (no animation)

describe("Classic Battle — outcome vs comparison surfaces", () => {
  let ui;
  let scoreboard;

  beforeEach(async () => {
    document.body.innerHTML = `
      <header>
        <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
        <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
        <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
        <p id="score-display" aria-live="polite" aria-atomic="true"></p>
      </header>
      <main>
        <p id="round-result"></p>
        <div id="opponent-card"></div>
        <div id="player-card"></div>
      </main>
    `;
    scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    // Initialize scoreboard references against the header we just created
    scoreboard.setupScoreboard({});
    ui = await import("../../../src/helpers/classicBattle/uiHelpers.js");
  });

  it("writes the outcome to #round-message and comparison to #round-result", () => {
    const outcome = "You win the round!";
    ui.showRoundOutcome(outcome);

    // Comparison uses a label derived from stat
    const store = { compareRaf: 0 };
    ui.showStatComparison(store, "power", 12, 8);

    const messageEl = document.getElementById("round-message");
    const compareEl = document.getElementById("round-result");

    expect(messageEl?.textContent).toContain("You win the round!");
    expect(compareEl?.textContent).toContain("Power – You: 12 Opponent: 8");
  });
});
