import { describe, it, expect, vi } from "vitest";

import * as scoreboard from "@/helpers/setupScoreboard.js";
import * as roundUI from "@/helpers/classicBattle/roundUI.js";

describe("roundUI auto-advance chain", () => {
  it("starts the round cooldown pipeline when a round resolves", async () => {
    // Arrange DOM basics used by handlers
    global.document.body.innerHTML = `
      <div id="snackbar-container" role="status"></div>
      <p id="round-message" role="status"></p>
      <p id="next-round-timer" data-testid="next-round-timer"></p>
      <button id="next-button" disabled data-role="next-round">Next</button>
    `;

    // Spy required modules via dynamic handler call path
    const updateScoreSpy = vi.spyOn(scoreboard, "updateScore").mockImplementation(() => {});

    // Rebind handlers (as in runtime) and dispatch roundResolved
    const result = { message: "ok", playerScore: 1, opponentScore: 0, matchEnded: false };
    const event = new CustomEvent("roundResolved", { detail: { result } });
    const createRoundTimer = vi.fn(() => ({ start: vi.fn() }));
    const attachCooldownRenderer = vi.fn();
    await roundUI.handleRoundResolvedEvent(event, {
      scoreboard,
      computeNextRoundCooldown: () => 5,
      createRoundTimer,
      attachCooldownRenderer,
      isOrchestrated: () => false
    });

    // Assert cooldown was started
    await Promise.resolve();
    expect(updateScoreSpy).toHaveBeenCalledWith(1, 0);
    expect(createRoundTimer).toHaveBeenCalledTimes(1);
    expect(attachCooldownRenderer).toHaveBeenCalledWith(
      createRoundTimer.mock.results[0]?.value,
      5,
      expect.objectContaining({
        waitForOpponentPrompt: false,
        maxPromptWaitMs: 0
      })
    );
  });
});
