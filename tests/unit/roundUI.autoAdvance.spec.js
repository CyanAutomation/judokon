import { describe, it, expect, vi } from "vitest";

import * as scoreboard from "@/helpers/setupScoreboard.js";
import { handleRoundResolvedEvent } from "@/helpers/classicBattle/roundUI.js";
import * as roundManager from "@/helpers/classicBattle/roundManager.js";

describe("roundUI auto-advance chain", () => {
  it("starts the round cooldown pipeline when a round resolves", async () => {
    document.body.innerHTML = `
      <div id="snackbar-container" role="status"></div>
      <p id="round-message" role="status"></p>
      <p id="next-round-timer" data-testid="next-round-timer"></p>
      <button id="next-button" disabled data-role="next-round">Next</button>
    `;

    vi.spyOn(scoreboard, "showMessage").mockImplementation(() => {});
    vi.spyOn(scoreboard, "updateScore").mockImplementation(() => {});
    vi.spyOn(scoreboard, "clearRoundCounter").mockImplementation(() => {});
    vi.spyOn(roundManager, "handleReplay").mockResolvedValue(undefined);

    const timerInstance = { start: vi.fn(() => Promise.resolve()) };
    const createRoundTimer = vi.fn(() => timerInstance);
    const attachCooldownRenderer = vi.fn();
    const computeNextRoundCooldown = vi.fn(() => 5);

    const result = { message: "ok", playerScore: 1, opponentScore: 0, matchEnded: false };
    const event = new CustomEvent("roundResolved", { detail: { result, store: {} } });

    await handleRoundResolvedEvent(event, {
      scoreboard,
      computeNextRoundCooldown,
      createRoundTimer,
      attachCooldownRenderer,
      isOrchestrated: () => false,
      resetStatButtons: vi.fn(),
      syncScoreDisplay: vi.fn(),
      updateDebugPanel: vi.fn()
    });

    expect(computeNextRoundCooldown).toHaveBeenCalledTimes(1);
    expect(createRoundTimer).toHaveBeenCalledTimes(1);

    const createdTimer = createRoundTimer.mock.results[0]?.value;
    expect(createdTimer).toBe(timerInstance);
    expect(timerInstance.start).toHaveBeenCalledTimes(1);
    expect(timerInstance.start).toHaveBeenCalledWith(5);

    expect(attachCooldownRenderer).toHaveBeenCalledWith(
      timerInstance,
      5,
      expect.objectContaining({
        waitForOpponentPrompt: false,
        maxPromptWaitMs: 0
      })
    );
  });
});
