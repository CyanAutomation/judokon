import { describe, it, expect, vi } from "vitest";

// Import the dynamic binding to hook roundResolved
import { handleRoundResolvedEvent } from "/workspaces/judokon/src/helpers/classicBattle/roundUI.js";

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
    const scoreboardModule = await import("/workspaces/judokon/src/helpers/setupScoreboard.js");
    vi.spyOn(scoreboardModule, "updateScore").mockImplementation(() => {});

    const startRoundCooldown = vi.fn().mockResolvedValue({
      controls: { ready: Promise.resolve() }
    });
    const computeNextRoundCooldown = vi.fn(() => 3);
    const createRoundTimer = vi.fn(() => ({}));
    const attachCooldownRenderer = vi.fn();
    const scoreboard = { updateScore: vi.fn(), showMessage: vi.fn(), clearRoundCounter: vi.fn() };

    const result = { message: "ok", playerScore: 1, opponentScore: 0, matchEnded: false };
    await handleRoundResolvedEvent(new CustomEvent("roundResolved", { detail: { result, store: {} } }), {
      scoreboard,
      computeNextRoundCooldown,
      createRoundTimer,
      attachCooldownRenderer,
      isOrchestrated: () => false,
      // inject the internal helper by property shadowing
      startRoundCooldown
    });

    expect(computeNextRoundCooldown).toHaveBeenCalled();
    expect(startRoundCooldown).toHaveBeenCalled();
  });
});
