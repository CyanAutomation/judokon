import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

async function loadBattleCLI() {
  const emitter = new EventTarget();
  const startRound = vi.fn();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(),
    startRound,
    resetGame: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed", "strength"] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([
      { statIndex: 1, name: "Speed" },
      { statIndex: 2, name: "Strength" }
    ])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  return { mod, startRound };
}

describe("battleCLI stat interactions", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <div id="cli-stats"></div>
      <ul id="cli-help"></ul>
      <div id="snackbar-container"></div>
      <div id="player-card"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/classicBattle/roundManager.js");
    vi.doUnmock("../../src/helpers/classicBattle/orchestrator.js");
    vi.doUnmock("../../src/helpers/classicBattle/battleEvents.js");
    vi.doUnmock("../../src/helpers/BattleEngine.js");
    vi.doUnmock("../../src/helpers/battleEngineFacade.js");
    vi.doUnmock("../../src/helpers/dataUtils.js");
    vi.doUnmock("../../src/helpers/constants.js");
  });

  it("adds .selected to chosen stat via key", async () => {
    const { mod } = await loadBattleCLI();
    await mod.renderStatList();
    mod.handleWaitingForPlayerActionKey("1");
    expect(document.querySelector('[data-stat-index="1"]').classList.contains("selected")).toBe(
      true
    );
  });

  it("shows stat values and responds to clicks", async () => {
    const { mod, startRound } = await loadBattleCLI();
    await mod.renderStatList();
    startRound.mockResolvedValue({
      playerJudoka: { stats: { speed: 5, strength: 7 } },
      roundNumber: 1
    });
    await mod.__test.startRoundWrapper();
    document.body.dataset.battleState = "waitingForPlayerAction";
    const statEl = document.querySelector('[data-stat-index="1"]');
    expect(statEl.textContent).toBe("[1] Speed: 5");
    const hiddenVal = document.querySelector("#player-card li.stat span")?.textContent;
    expect(hiddenVal).toBe("5");
    statEl.click();
    expect(statEl.classList.contains("selected")).toBe(true);
  });
});
