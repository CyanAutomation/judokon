import { describe, it, expect, afterEach, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

async function loadBattleCLI() {
  const emitter = new EventTarget();
  const setFlag = vi.fn();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn((flag) => flag === "cliVerbose"),
    setFlag,
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
    getPointsToWin: vi.fn(() => 5),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson: vi.fn().mockResolvedValue([]) }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
    autoSelectStat: vi.fn()
  }));
  const mod = await import("../../src/pages/battleCLI.js");
  return { mod, setFlag };
}

describe("battleCLI verbose flag", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    vi.unstubAllGlobals();
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

  it("enables verbose mode via query param without console noise", async () => {
    window.__TEST__ = true;
    // Simulate URL with verbose param
    const url = new URL("http://localhost/?verbose=1");
    vi.stubGlobal("location", url);
    document.body.innerHTML = `
      <div id="cli-root"></div>
      <div id="cli-main"></div>
      <div id="cli-stats"></div>
      <select id="points-select"><option value="5">5</option></select>
      <input id="verbose-toggle" type="checkbox" />
      <section id="cli-verbose-section" hidden><pre id="cli-verbose-log"></pre></section>
      <div id="cli-shortcuts"><button id="cli-shortcuts-close"></button></div>
      <span id="battle-state-badge"></span>
      <div id="round-message"></div>
      <div id="cli-countdown"></div>
      <div id="cli-score" data-score-player="0" data-score-opponent="0"></div>
      <div id="snackbar-container"></div>
    `;
    const { mod, setFlag } = await loadBattleCLI();
    await withMutedConsole(async () => {
      await mod.__test.init();
      mod.__test.handleBattleState({ detail: { from: "init", to: "waiting" } });
    }, ["info"]);
    expect(setFlag).toHaveBeenCalledWith("cliVerbose", true);
    expect(document.getElementById("cli-verbose-section").hidden).toBe(false);
  });
});
