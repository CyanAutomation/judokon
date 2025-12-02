import { describe, it, expect, afterEach, vi } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  mockEmitter,
  mockGetScores,
  mockIsEnabled,
  mockInitFeatureFlags,
  mockSetFlag,
  mockSkipRoundCooldown,
  mockUpdateBattleStateBadge,
  mockOnBattleEvent,
  mockEmitBattleEvent,
  mockCreateBattleStore,
  mockStartRound,
  mockResetGame,
  mockInitOrchestrator,
  mockFetchJson,
  mockAutoSelectStat
} = vi.hoisted(() => {
  const emitter = new EventTarget();
  const getScores = vi.fn();
  return {
    mockEmitter: emitter,
    mockGetScores: getScores,
    mockIsEnabled: vi.fn(() => false),
    mockInitFeatureFlags: vi.fn(),
    mockSetFlag: vi.fn(),
    mockSkipRoundCooldown: vi.fn(),
    mockUpdateBattleStateBadge: vi.fn(),
    mockOnBattleEvent: vi.fn(),
    mockEmitBattleEvent: vi.fn(),
    mockCreateBattleStore: vi.fn(() => ({})),
    mockStartRound: vi.fn(),
    mockResetGame: vi.fn(),
    mockInitOrchestrator: vi.fn(),
    mockFetchJson: vi.fn().mockResolvedValue([]),
    mockAutoSelectStat: vi.fn()
  };
});

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/featureFlags.js", () => ({
  initFeatureFlags: mockInitFeatureFlags,
  isEnabled: mockIsEnabled,
  setFlag: mockSetFlag,
  featureFlagsEmitter: mockEmitter
}));
vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  skipRoundCooldownIfEnabled: mockSkipRoundCooldown,
  updateBattleStateBadge: mockUpdateBattleStateBadge
}));
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: mockOnBattleEvent,
  emitBattleEvent: mockEmitBattleEvent
}));
vi.mock("../../src/helpers/classicBattle/roundManager.js", () => ({
  createBattleStore: mockCreateBattleStore,
  startRound: mockStartRound,
  resetGame: mockResetGame
}));
vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  initClassicBattleOrchestrator: mockInitOrchestrator
}));
vi.mock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed"] }));
vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
  setPointsToWin: vi.fn(),
  getPointsToWin: vi.fn(),
  getScores: mockGetScores
}));
vi.mock("../../src/helpers/dataUtils.js", () => ({ fetchJson: mockFetchJson }));
vi.mock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: mockAutoSelectStat
}));

async function loadHandlers(scores) {
  mockGetScores.mockReturnValue(scores);
  window.__TEST__ = true;
  const { battleCLI } = await import("../../src/pages/index.js");
  return { handlers: battleCLI, getScoresMock: mockGetScores };
}

describe("battleCLI scoreboard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("updates after player win", async () => {
    const { handlers } = await loadHandlers({ playerScore: 1, opponentScore: 0 });
    handlers.ensureCliDomForTest({ reset: true });
    handlers.handleRoundResolved({ detail: { result: { message: "Win" } } });
    const el = document.getElementById("score-display");
    expect(el.dataset.scorePlayer).toBe("1");
    expect(el.dataset.scoreOpponent).toBe("0");
  });

  it("updates after player loss", async () => {
    const { handlers, getScoresMock } = await loadHandlers({
      playerScore: 0,
      opponentScore: 1
    });
    handlers.ensureCliDomForTest({ reset: true });
    getScoresMock.mockReturnValueOnce({ playerScore: 2, opponentScore: 2 });
    getScoresMock.mockReturnValue({ playerScore: 0, opponentScore: 1 });
    handlers.handleRoundResolved({ detail: { result: { message: "Loss" } } });
    handlers.handleRoundResolved({ detail: { result: { message: "Loss" } } });
    const el = document.getElementById("score-display");
    expect(el.dataset.scorePlayer).toBe("0");
    expect(el.dataset.scoreOpponent).toBe("1");
  });

  it("updates after draw", async () => {
    const { handlers, getScoresMock } = await loadHandlers({
      playerScore: 0,
      opponentScore: 0
    });
    handlers.ensureCliDomForTest({ reset: true });
    getScoresMock.mockReturnValueOnce({ playerScore: 5, opponentScore: 6 });
    getScoresMock.mockReturnValue({ playerScore: 0, opponentScore: 0 });
    handlers.handleRoundResolved({ detail: { result: { message: "Draw" } } });
    handlers.handleRoundResolved({ detail: { result: { message: "Draw" } } });
    const el = document.getElementById("score-display");
    expect(el.dataset.scorePlayer).toBe("0");
    expect(el.dataset.scoreOpponent).toBe("0");
  });
});
