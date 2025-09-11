import { describe, it, beforeEach, expect } from "vitest";

describe("Scoreboard live region discipline", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
    `;
    document.body.appendChild(header);
  });

  it("initializes score display with aria-live=off and does not announce on timer ticks", async () => {
    const header = document.querySelector("header");
    const { initScoreboard, updateTimer } = await import("../../src/components/Scoreboard.js");
    initScoreboard(header);

    const score = document.getElementById("score-display");
    expect(score.getAttribute("aria-live")).toBe("off");

    const msg = document.getElementById("round-message");
    msg.textContent = "Outcome here";
    msg.dataset.outcome = "true";

    updateTimer(5);
    expect(msg.textContent).toBe("Outcome here");
    expect(msg.dataset.outcome).toBe("true");
  });
});
