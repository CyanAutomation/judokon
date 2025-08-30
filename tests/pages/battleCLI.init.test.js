import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";

async function loadBattleCLI() {
  const emitter = new EventTarget();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi
      .fn()
      .mockResolvedValue({ featureFlags: { cliVerbose: { enabled: false } } }),
    isEnabled: vi.fn().mockReturnValue(false),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: [] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({ setPointsToWin: vi.fn() }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([{ statIndex: 1, name: "Speed" }])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  return mod;
}

describe("battleCLI init helpers", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <div id="cli-stats"></div>
      <div id="cli-help"></div>
      <select id="points-select"></select>
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
    `;
    const machine = { dispatch: vi.fn() };
    window.__getClassicBattleMachine = vi.fn(() => machine);
    window.__TEST_MACHINE__ = machine;
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    delete window.__getClassicBattleMachine;
    delete window.__TEST_MACHINE__;
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
    localStorage.clear();
  });

  it("invokes init helpers", async () => {
    const mod = await loadBattleCLI();
    await mod.__test.init();
    expect(window.__TEST_MACHINE__.dispatch).toHaveBeenCalled();
    expect(document.getElementById("cli-stats").children.length).toBeGreaterThan(0);
    const { setPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    expect(setPointsToWin).toHaveBeenCalledWith(5);
  });
});
