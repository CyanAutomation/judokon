import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

async function loadBattleCLI() {
  const emitter = new EventTarget();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(),
    startRound: vi.fn().mockResolvedValue({ playerJudoka: null, roundNumber: 2 })
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: [] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn().mockReturnValue(10)
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson: vi.fn().mockResolvedValue([]) }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  return mod;
}

describe("battleCLI round header", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <div id="cli-stats"></div>
      <div id="cli-round"></div>
      <div id="round-message"></div>
      <div id="snackbar-container"></div>
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

  it("updates round header each round", async () => {
    const mod = await loadBattleCLI();
    await mod.__test.startRoundWrapper();
    expect(document.getElementById("cli-round").textContent).toBe("Round 2 of 10");
  });
});
