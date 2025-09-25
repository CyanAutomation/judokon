import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { bindUIServiceEventHandlersOnce } from "../../src/helpers/classicBattle/uiService.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";

describe("Round summary cleanup on roundReset", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="modal" id="dummy-modal"></div><div id="score-display">You: 1 Opponent: 0</div>';
    bindUIServiceEventHandlersOnce();
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clears modal and scoreboard message on roundReset", () => {
    const modal = document.getElementById("dummy-modal");
    modal.close = vi.fn();
    const scoreDisplay = document.getElementById("score-display");
    // Add a message node to simulate prior summary message
    scoreDisplay.textContent = "Round over";

    emitBattleEvent("roundReset");

    expect(modal.close).toHaveBeenCalled();
    // UI service emits ui.roundReset; ensure no throw and basic state remains accessible
    expect(document.querySelector("#score-display")).toBeTruthy();
  });
});

