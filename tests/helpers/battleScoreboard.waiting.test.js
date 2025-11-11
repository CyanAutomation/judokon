import { describe, it, beforeEach, expect } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

describe("battleScoreboard waiting fallback", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = document.createElement("header");
    header.className = "battle-header";
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
    container.appendChild(header);
    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);
    const mock = await import("./mockScheduler.js");
    // Import setScheduler dynamically here to ensure same module instance
    const { setScheduler } = await import("../../src/helpers/scheduler.js");
    setScheduler(mock.createMockScheduler());
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();
  });

  afterEach(() => {
    clearBody();
  });

  it("shows 'Waiting…' after 500ms and clears on first state event", async () => {
    const { getScheduler } = await import("../../src/helpers/scheduler.js");
    const scheduler = getScheduler();
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("");
    scheduler.tick(499);
    expect(msg.textContent).toBe("");
    scheduler.tick(1);
    expect(msg.textContent).toMatch(/Waiting/);

    // Next state should clear it
    emitBattleEvent("control.state.changed", { to: "selection" });
    expect(msg.textContent).toBe("");
  });
});
