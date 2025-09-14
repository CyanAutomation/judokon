import { describe, it, beforeEach, afterEach, expect } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

describe("battleScoreboard out-of-order guards", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = document.createElement("header");
    header.className = "battle-header";
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="off" aria-atomic="true"></p>
    `;
    container.appendChild(header);
    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
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
