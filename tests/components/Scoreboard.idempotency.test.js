import { describe, it, beforeEach, expect } from "vitest";

describe("Scoreboard idempotent init and destroy cleanup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="off" aria-atomic="true"></p>
    `;
    document.body.appendChild(header);
  });

  it("repeated initScoreboard does not clear existing message", async () => {
    const header = document.querySelector("header");
    const { initScoreboard, showMessage } = await import("../../src/components/Scoreboard.js");
    initScoreboard(header);
    showMessage("Hello", { outcome: true });
    initScoreboard(header);
    expect(document.getElementById("round-message").textContent).toBe("Hello");
  });

  it("destroy unsubscribes adapter listeners (no further updates)", async () => {
    const header = document.querySelector("header");
    const { initScoreboard, destroy } = await import("../../src/components/Scoreboard.js");
    initScoreboard(header);
    const { initBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    initBattleScoreboardAdapter();

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("round.started", { roundIndex: 1 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 1");

    destroy();

    emitBattleEvent("round.started", { roundIndex: 2 });
    // Should not update after destroy
    expect(document.getElementById("round-counter").textContent).toBe("Round 1");
  });
});
