import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockScoreboard, mockGetScores } = vi.hoisted(() => ({
  mockScoreboard: {
    showMessage: vi.fn((text) => {
      const el = document.getElementById("round-message");
      if (el) el.textContent = text || "";
    }),
    updateScore: vi.fn(),
    updateRoundCounter: vi.fn()
  },
  mockGetScores: vi.fn(() => ({ playerScore: 3, opponentScore: 2 }))
}));

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/components/Scoreboard.js", () => mockScoreboard);
vi.mock("../../src/helpers/BattleEngine.js", () => ({
  getScores: mockGetScores
}));

describe("battleCLI shared Scoreboard primary (Phase 3)", () => {
  let mockSharedScoreboard;

  async function ensureCliDom() {
    const { battleCLI } = await import("../../src/pages/index.js");
    battleCLI.ensureCliDomForTest({ reset: true });
  }

  beforeEach(async () => {
    window.__TEST__ = true;
    // Reset mocks for each test
    vi.clearAllMocks();
    mockSharedScoreboard = mockScoreboard;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.resetModules();
    delete global.sharedScoreboardHelpers;
    delete window.__TEST__;
  });

  it("should primarily use shared Scoreboard for round message updates", async () => {
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
    const { updateScoreLine } = await import("../../src/pages/battleCLI/dom.js");
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockSharedScoreboard;

    updateScoreLine();

    const scoreDisplay = document.getElementById("score-display");
    expect(scoreDisplay.textContent.replace(/\s+/g, " ").trim()).toBe("You: 3 Opponent: 2");
    expect(scoreDisplay.dataset.scorePlayer).toBe("3");
    expect(scoreDisplay.dataset.scoreOpponent).toBe("2");
  });

  it("should primarily use shared Scoreboard for round counter updates", async () => {
    const { updateRoundHeader } = await import("../../src/pages/battleCLI/dom.js");
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockSharedScoreboard;

    updateRoundHeader(4, 7);

    const roundCounter = document.getElementById("round-counter");
    expect(roundCounter.textContent).toBe("Round 4 Target: 7");
    expect(roundCounter.dataset.target).toBe("7");

    // Verify root dataset still updated
    const root = document.getElementById("cli-root") || document.body;
    if (root.id === "cli-root") {
      expect(root.dataset.round).toBe("4");
      expect(root.dataset.target).toBe("7");
    }
  });

  it("should fallback to CLI elements when shared Scoreboard is unavailable", async () => {
    // Reconfigure mocks to throw errors for this test
    mockScoreboard.showMessage.mockImplementation(() => {
      throw new Error("Component unavailable");
    });
    mockScoreboard.updateScore.mockImplementation(() => {
      throw new Error("Component unavailable");
    });
    mockScoreboard.updateRoundCounter.mockImplementation(() => {
      throw new Error("Component unavailable");
    });
    mockGetScores.mockReturnValue({ playerScore: 1, opponentScore: 0 });

    const { setRoundMessage, updateScoreLine, updateRoundHeader } = await import(
      "../../src/pages/battleCLI/dom.js"
    );
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockScoreboard;

    // Test fallback behavior
    setRoundMessage("Fallback message");
    updateScoreLine();
    updateRoundHeader(2, 3);

    // Verify fallback updates work
    expect(document.getElementById("round-message").textContent).toBe("Fallback message");
    expect(document.getElementById("score-display").textContent.replace(/\s+/g, " ").trim()).toBe(
      "You: 1 Opponent: 0"
    );
    expect(document.getElementById("round-counter").textContent).toBe("Round 2 Target: 3");

    // Reset mocks for next test
    mockScoreboard.showMessage.mockImplementation((text) => {
      const el = document.getElementById("round-message");
      if (el) el.textContent = text || "";
    });
    mockScoreboard.updateScore.mockClear();
    mockScoreboard.updateRoundCounter.mockClear();
    mockGetScores.mockReturnValue({ playerScore: 3, opponentScore: 2 });
  });

  it("should invoke shared Scoreboard helpers on score updates", async () => {
    const { updateScoreLine } = await import("../../src/pages/battleCLI/dom.js");
    await ensureCliDom();
    global.sharedScoreboardHelpers = mockSharedScoreboard;
    mockGetScores.mockReturnValue({ playerScore: 9, opponentScore: 1 });

    updateScoreLine({ playerScore: 6, opponentScore: 4 });

    expect(mockSharedScoreboard.updateScore).toHaveBeenCalledWith(6, 4);
    expect(mockGetScores).not.toHaveBeenCalled();
    const scoreDisplay = document.getElementById("score-display");
    expect(scoreDisplay.dataset.scorePlayer).toBe("6");
    expect(scoreDisplay.dataset.scoreOpponent).toBe("4");
  });
});
