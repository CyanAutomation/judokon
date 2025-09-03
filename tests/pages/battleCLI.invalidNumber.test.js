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
  vi.doMock("../../src/helpers/constants.js", () => ({
    DATA_DIR: "",
    SNACKBAR_REMOVE_MS: 3000
  }));
  const mod = await import("../../src/pages/battleCLI.js");
  return { mod };
}

describe("battleCLI invalid number hint", () => {
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

  it("shows hint for digits without stats", async () => {
    const { mod } = await loadBattleCLI();
    const keys = ["0", "6"];
    for (const key of keys) {
      document.getElementById("snackbar-container").innerHTML = "";
      mod.handleWaitingForPlayerActionKey(key);
      expect(document.querySelector("#snackbar-container .snackbar")?.textContent).toBe(
        "Use 1-5, press H for help"
      );
    }
  });
});
