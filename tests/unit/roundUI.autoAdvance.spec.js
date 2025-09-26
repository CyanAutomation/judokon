import { describe, it, expect, vi } from "vitest";

// Import the dynamic binding to hook roundResolved
import * as roundUI from "@/helpers/classicBattle/roundUI.js";

describe("roundUI auto-advance chain", () => {
  it("calls startRoundCooldown on roundResolved", async () => {
    // Arrange DOM basics used by handlers
    global.document.body.innerHTML = `
      <div id="snackbar-container" role="status"></div>
      <p id="round-message" role="status"></p>
      <p id="next-round-timer" data-testid="next-round-timer"></p>
      <button id="next-button" disabled data-role="next-round">Next</button>
    `;

    // Spy required modules via dynamic handler call path
    const scoreboard = await import("@/helpers/setupScoreboard.js");
    const updateScoreSpy = vi.spyOn(scoreboard, "updateScore").mockImplementation(() => {});

    const rui = await import("@/helpers/classicBattle/roundUI.js");
    expect(rui.startRoundCooldown).toBe(roundUI.startRoundCooldown);

    // Rebind handlers (as in runtime) and dispatch roundResolved
    const result = { message: "ok", playerScore: 1, opponentScore: 0, matchEnded: false };
    const event = new CustomEvent("roundResolved", { detail: { result } });
    const createRoundTimer = () => ({ start: vi.fn() });
    const attachCooldownRenderer = vi.fn();
    await rui.handleRoundResolvedEvent(event, {
      scoreboard,
      computeNextRoundCooldown: () => 5,
      createRoundTimer,
      attachCooldownRenderer
    });

    // Assert cooldown was started
    await Promise.resolve();
    expect(updateScoreSpy).toHaveBeenCalled();
    expect(attachCooldownRenderer).toHaveBeenCalledWith(expect.any(Object), 5, expect.any(Object));
  });
});
