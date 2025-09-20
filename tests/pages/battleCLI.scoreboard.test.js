import { describe, it, expect, afterEach, vi } from "vitest";

async function loadHandlers(scores) {
  const emitter = new EventTarget();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn(() => false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
    skipRoundCooldownIfEnabled: vi.fn(),
    updateBattleStateBadge: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn(),
    resetGame: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed"] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(),
    getScores: vi.fn(() => scores)
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson: vi.fn().mockResolvedValue([]) }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
    autoSelectStat: vi.fn()
  }));
  window.__TEST__ = true;
  const { battleCLI } = await import("../../src/pages/index.js");
  return battleCLI;
}

describe("battleCLI scoreboard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/classicBattle/uiHelpers.js");
    vi.doUnmock("../../src/helpers/classicBattle/battleEvents.js");
    vi.doUnmock("../../src/helpers/classicBattle/roundManager.js");
    vi.doUnmock("../../src/helpers/classicBattle/orchestrator.js");
    vi.doUnmock("../../src/helpers/BattleEngine.js");
    vi.doUnmock("../../src/helpers/battleEngineFacade.js");
    vi.doUnmock("../../src/helpers/dataUtils.js");
    vi.doUnmock("../../src/helpers/constants.js");
    vi.doUnmock("../../src/helpers/classicBattle/autoSelectStat.js");
  });

  it("updates after player win", async () => {
    const handlers = await loadHandlers({ playerScore: 1, opponentScore: 0 });
    handlers.ensureCliDomForTest({ reset: true });
    handlers.handleRoundResolved({ detail: { result: { message: "Win" } } });
    const el = document.getElementById("cli-score");
    expect(el.dataset.scorePlayer).toBe("1");
    expect(el.dataset.scoreOpponent).toBe("0");
  });

  it("updates after player loss", async () => {
    const handlers = await loadHandlers({ playerScore: 0, opponentScore: 1 });
    handlers.ensureCliDomForTest({ reset: true });
    const scoreEl = document.getElementById("cli-score");
    scoreEl.dataset.scorePlayer = "2";
    scoreEl.dataset.scoreOpponent = "2";
    scoreEl.textContent = "You: 2 Opponent: 2";
    handlers.handleRoundResolved({ detail: { result: { message: "Loss" } } });
    const el = document.getElementById("cli-score");
    expect(el.dataset.scorePlayer).toBe("0");
    expect(el.dataset.scoreOpponent).toBe("1");
  });

  it("updates after draw", async () => {
    const handlers = await loadHandlers({ playerScore: 0, opponentScore: 0 });
    handlers.ensureCliDomForTest({ reset: true });
    const scoreEl = document.getElementById("cli-score");
    scoreEl.dataset.scorePlayer = "5";
    scoreEl.dataset.scoreOpponent = "6";
    scoreEl.textContent = "You: 5 Opponent: 6";
    handlers.handleRoundResolved({ detail: { result: { message: "Draw" } } });
    const el = document.getElementById("cli-score");
    expect(el.dataset.scorePlayer).toBe("0");
    expect(el.dataset.scoreOpponent).toBe("0");
  });
});
