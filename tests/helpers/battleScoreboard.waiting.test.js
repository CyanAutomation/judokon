import { describe, it, beforeEach, expect, vi } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";

describe("battleScoreboard waiting fallback", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    __resetBattleEventTarget();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    header.className = "battle-header";
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true"></p>
    `;
    document.body.appendChild(header);
    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
    initScoreboard(header);
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();
  });

  it("shows 'Waiting…' after 500ms and clears on first state event", async () => {
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("");
    await vi.advanceTimersByTimeAsync(499);
    expect(msg.textContent).toBe("");
    await vi.advanceTimersByTimeAsync(1);
    expect(msg.textContent).toMatch(/Waiting/);

    // Next state should clear it
    emitBattleEvent("control.state.changed", { to: "selection" });
    expect(msg.textContent).toBe("");
  });
});
