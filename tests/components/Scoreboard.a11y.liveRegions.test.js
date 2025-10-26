import { describe, it, beforeEach, expect } from "vitest";

describe("Scoreboard live region discipline", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    const header = document.createElement("header");
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
    document.body.appendChild(header);
  });

  it("keeps score display in a polite live region without disrupting outcome messaging", async () => {
    const header = document.querySelector("header");
    const { initScoreboard, updateTimer, resetScoreboard } = await import(
      "../../src/components/Scoreboard.js"
    );
    resetScoreboard();
    initScoreboard(header);

    const score = document.getElementById("score-display");
    expect(score.getAttribute("aria-live")).toBe("polite");

    const msg = document.getElementById("round-message");
    msg.textContent = "Outcome here";
    msg.dataset.outcome = "true";

    updateTimer(5);
    expect(msg.textContent).toBe("Outcome here");
    expect(msg.dataset.outcome).toBe("true");
  });
});
