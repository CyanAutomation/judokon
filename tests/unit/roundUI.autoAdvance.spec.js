import { describe, it, expect, vi } from "vitest";

// Import the dynamic binding to hook roundResolved
import * as roundUI from "/workspaces/judokon/src/helpers/classicBattle/roundUI.js";

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
    const scoreboard = await import("/workspaces/judokon/src/helpers/setupScoreboard.js");
    vi.spyOn(scoreboard, "updateScore").mockImplementation(() => {});

    const rui = await import("/workspaces/judokon/src/helpers/classicBattle/roundUI.js");
    const startRoundCooldownSpy = vi
      .spyOn(rui, "startRoundCooldown")
      .mockResolvedValue({ controls: { ready: Promise.resolve(), resolveReady: () => {} } });

    // Rebind handlers (as in runtime) and dispatch roundResolved
    roundUI.bindRoundUIEventHandlersDynamic();
    const result = { message: "ok", playerScore: 1, opponentScore: 0, matchEnded: false };
    window.dispatchEvent(new CustomEvent("roundResolved", { detail: { result } }));

    // Assert cooldown was started
    expect(startRoundCooldownSpy).toHaveBeenCalled();
  });
});
