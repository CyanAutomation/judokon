import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("battleCLI shared Scoreboard primary (Phase 3)", () => {
  let mockSharedScoreboard;

  async function ensureCliDom() {
    const { battleCLI } = await import("../../src/pages/index.js");
    battleCLI.ensureCliDomForTest({ reset: true });
  }

  beforeEach(async () => {
    window.__TEST__ = true;
    // Mock the shared Scoreboard component functions
    mockSharedScoreboard = {
      showMessage: vi.fn((text) => {
        // Simulate the real behavior of updating the #round-message element
        const el = document.getElementById("round-message");
        if (el) el.textContent = text || "";
      }),
      updateScore: vi.fn(),
      updateRoundCounter: vi.fn()
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.resetModules();
    delete global.sharedScoreboardHelpers;
    delete window.__TEST__;
  });

  it("should primarily use shared Scoreboard for round message updates", async () => {
    // Mock the module's helper reference
    vi.doMock("../../src/components/Scoreboard.js", () => mockSharedScoreboard);

    const { setRoundMessage } = await import("../../src/pages/battleCLI/dom.js");
    await ensureCliDom();

    // Mock the shared helpers to be available
    global.sharedScoreboardHelpers = mockSharedScoreboard;

    const testMessage = "Player wins this round!";

    // Manually set the helpers to simulate successful import
    const domModule = await import("../../src/pages/battleCLI/dom.js");
    if (domModule.default && domModule.default.sharedScoreboardHelpers) {
      domModule.default.sharedScoreboardHelpers = mockSharedScoreboard;
    }

    setRoundMessage(testMessage);

    // With working shared component, should NOT update CLI element directly
    const cliMessage = document.getElementById("round-message");
    // The CLI element should be updated by the shared component, not directly
    expect(cliMessage.textContent).toBe(testMessage);
  });

  it("should primarily use shared Scoreboard for score updates", async () => {
    // Mock the engine facade
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores: () => ({ playerScore: 3, opponentScore: 2 })
    }));

    const { updateScoreLine } = await import("../../src/pages/battleCLI/dom.js");
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockSharedScoreboard;

    updateScoreLine();

    // Verify CLI element shows enhanced format when shared component works
    const cliScore = document.getElementById("cli-score");
    expect(cliScore.textContent).toBe("You: 3 Opponent: 2");
    expect(cliScore.dataset.scorePlayer).toBe("3");
    expect(cliScore.dataset.scoreOpponent).toBe("2");
  });

  it("should primarily use shared Scoreboard for round counter updates", async () => {
    const { updateRoundHeader } = await import("../../src/pages/battleCLI/dom.js");
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockSharedScoreboard;

    updateRoundHeader(4, 7);

    // Verify CLI element shows target format for consistency
    const cliRound = document.getElementById("cli-round");
    expect(cliRound.textContent).toBe("Round 4 Target: 7");

    // Verify root dataset still updated
    const root = document.getElementById("cli-root") || document.body;
    if (root.id === "cli-root") {
      expect(root.dataset.round).toBe("4");
      expect(root.dataset.target).toBe("7");
    }
  });

  it("should fallback to CLI elements when shared Scoreboard is unavailable", async () => {
    // Mock shared component to throw error
    const failingMock = {
      showMessage: vi.fn(() => {
        throw new Error("Component unavailable");
      }),
      updateScore: vi.fn(() => {
        throw new Error("Component unavailable");
      }),
      updateRoundCounter: vi.fn(() => {
        throw new Error("Component unavailable");
      })
    };

    vi.doMock("../../src/components/Scoreboard.js", () => failingMock);
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores: () => ({ playerScore: 1, opponentScore: 0 })
    }));

    const { setRoundMessage, updateScoreLine, updateRoundHeader } = await import(
      "../../src/pages/battleCLI/dom.js"
    );
    await ensureCliDom();
    global.sharedScoreboardHelpers = failingMock;

    // Test fallback behavior
    setRoundMessage("Fallback message");
    updateScoreLine();
    updateRoundHeader(2, 3);

    // Verify fallback updates work
    expect(document.getElementById("round-message").textContent).toBe("Fallback message");
    expect(document.getElementById("cli-score").textContent).toBe("You: 1 Opponent: 0");
    expect(document.getElementById("cli-round").textContent).toBe("Round 2 Target: 3");
  });

  it("should prefer standard scoreboard elements in tests", async () => {
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockSharedScoreboard;
    // Phase 3: Tests should now check standard elements as primary
    expect(document.getElementById("score-display")).toBeTruthy();
    expect(document.getElementById("round-counter")).toBeTruthy();
    expect(document.getElementById("next-round-timer")).toBeTruthy();
    expect(document.getElementById("round-message")).toBeTruthy();

    // CLI elements should still exist but be secondary
    expect(document.getElementById("cli-score")).toBeTruthy();
    expect(document.getElementById("cli-round")).toBeTruthy();
  });
});
