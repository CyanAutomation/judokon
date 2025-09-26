import { describe, it, expect, vi } from "vitest";

describe("roundUI auto-advance chain", () => {
  it("invokes cooldown flow with injected deps", async () => {
    // Arrange DOM basics used by handlers
    global.document.body.innerHTML = `
      <div id="snackbar-container" role="status"></div>
      <p id="round-message" role="status"></p>
      <p id="next-round-timer" data-testid="next-round-timer"></p>
      <button id="next-button" disabled data-role="next-round">Next</button>
    `;

    // Spy required modules via dynamic handler call path
    const scoreboardModule = await import("@/helpers/setupScoreboard.js");
    vi.spyOn(scoreboardModule, "updateScore").mockImplementation(() => {});

    const roundUIModule = await import("@/helpers/classicBattle/roundUI.js");
    const { handleRoundResolvedEvent } = roundUIModule;
    const computeNextRoundCooldown = vi.fn(() => 3);
    const createRoundTimer = vi.fn(() => ({ start: vi.fn() }));
    const attachCooldownRenderer = vi.fn();
    const scoreboard = { updateScore: vi.fn(), showMessage: vi.fn(), clearRoundCounter: vi.fn() };

    const result = { message: "ok", playerScore: 1, opponentScore: 0, matchEnded: false };
    await handleRoundResolvedEvent(
      new CustomEvent("roundResolved", { detail: { result, store: {} } }),
      {
        scoreboard,
        computeNextRoundCooldown,
        createRoundTimer,
        attachCooldownRenderer,
        isOrchestrated: () => false
      }
    );

    expect(computeNextRoundCooldown).toHaveBeenCalled();
    expect(attachCooldownRenderer).toHaveBeenCalled();
  });
});
