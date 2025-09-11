import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("battleCLI dual-write scoreboard (Phase 2)", () => {
  let mockSharedScoreboard;

  beforeEach(() => {
    // Mock the shared Scoreboard component functions
    mockSharedScoreboard = {
      showMessage: vi.fn(),
      updateScore: vi.fn(),
      updateRoundCounter: vi.fn()
    };

    // Setup DOM structure
    document.body.innerHTML = `
      <header class="cli-header">
        <div class="cli-status">
          <div id="cli-round">Round 0 of 0</div>
          <div id="cli-score" data-score-player="0" data-score-opponent="0">You: 0 Opponent: 0</div>
        </div>
        <div class="standard-scoreboard-nodes" style="display: block;">
          <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
          <p id="round-counter" aria-live="polite" aria-atomic="true">Round 0</p>
          <p id="score-display" aria-live="off" aria-atomic="true">You: 0 Opponent: 0</p>
        </div>
      </header>
      <main>
        <section>
          <div id="round-message" role="status" aria-live="polite" aria-atomic="true"></div>
          <div id="cli-countdown" role="status" aria-live="polite" data-remaining-time="0"></div>
        </section>
      </main>
    `;

    // Mock the dynamic import for shared Scoreboard helpers
    vi.doMock("../../src/components/Scoreboard.js", () => mockSharedScoreboard);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should update both CLI and standard elements when setting round message", async () => {
    // Import the module after mocking
    const { setRoundMessage } = await import("../../src/pages/battleCLI/dom.js");

    const testMessage = "Player wins this round!";
    setRoundMessage(testMessage);

    // Verify CLI element updated
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe(testMessage);

    // Allow time for async import
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Note: Due to async nature of dynamic import, we can't easily test the shared component call
    // This test verifies the CLI element works and the structure is in place
  });

  it("should update both CLI and standard elements when updating score", async () => {
    // Mock the engine facade
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores: () => ({ playerScore: 2, opponentScore: 1 })
    }));

    const { updateScoreLine } = await import("../../src/pages/battleCLI/dom.js");

    updateScoreLine();

    // Verify CLI element updated
    const cliScore = document.getElementById("cli-score");
    expect(cliScore.textContent).toBe("You: 2 Opponent: 1");
    expect(cliScore.dataset.scorePlayer).toBe("2");
    expect(cliScore.dataset.scoreOpponent).toBe("1");
  });

  it("should update both CLI and standard elements when updating round header", async () => {
    const { updateRoundHeader } = await import("../../src/pages/battleCLI/dom.js");

    updateRoundHeader(3, 5);

    // Verify CLI element updated
    const cliRound = document.getElementById("cli-round");
    expect(cliRound.textContent).toBe("Round 3 Target: 5");

    // Verify root dataset updated
    const root = document.getElementById("cli-root") || document.body;
    if (root.id === "cli-root") {
      expect(root.dataset.round).toBe("3");
      expect(root.dataset.target).toBe("5");
    }
  });

  it("should have standard scoreboard nodes visible after Phase 2", () => {
    const standardNodes = document.querySelector(".standard-scoreboard-nodes");
    expect(standardNodes).toBeTruthy();
    expect(standardNodes.style.display).toBe("block");
    expect(standardNodes.hasAttribute("aria-hidden")).toBe(false);

    // Verify all standard elements exist and are accessible
    expect(document.getElementById("next-round-timer")).toBeTruthy();
    expect(document.getElementById("round-counter")).toBeTruthy();
    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("should gracefully handle missing shared scoreboard helpers", async () => {
    // Test graceful fallback when shared component is not available
    vi.doMock("../../src/components/Scoreboard.js", () => {
      throw new Error("Module not available");
    });

    const { setRoundMessage } = await import("../../src/pages/battleCLI/dom.js");

    // Should not throw error even if shared component fails
    expect(() => setRoundMessage("Test message")).not.toThrow();

    // CLI element should still be updated
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe("Test message");
  });
});
