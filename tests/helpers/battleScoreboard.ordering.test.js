import { describe, it, beforeEach, afterEach, expect } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";
import { createDiv } from "../helpers/domFactory.js";

describe("battleScoreboard out-of-order guards", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = createDiv({ className: "battle-header" });
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="off" aria-atomic="true">
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
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();
  });

  afterEach(() => {
    clearBody();
  });

  it("ignores older round.started events after a newer one", async () => {
    emitBattleEvent("round.started", { roundIndex: 3 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");
    emitBattleEvent("round.started", { roundIndex: 2 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");
    emitBattleEvent("round.started", { roundIndex: 4 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 4");
  });
});
