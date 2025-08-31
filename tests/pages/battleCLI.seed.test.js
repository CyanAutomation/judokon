import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";

async function loadBattleCLI(seed) {
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
    startRound: vi.fn(),
    resetGame: vi.fn()
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
    getPointsToWin: vi.fn(() => 5),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([{ statIndex: 1, name: "Speed" }])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.stubGlobal("location", new URL(`http://localhost/battleCLI.html?seed=${seed}`));
  const mod = await import("../../src/pages/battleCLI.js");
  return mod;
}

describe("battleCLI deterministic seed", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <main id="cli-main"></main>
      <div id="cli-stats"></div>
      <div id="cli-help"></div>
      <select id="points-select"></select>
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
      <input id="seed-input" type="number" />
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
    vi.unstubAllGlobals();
  });

  it("applies seed for deterministic random", async () => {
    const mod = await loadBattleCLI(5);
    await mod.__test.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    const { seededRandom } = await import("../../src/helpers/testModeUtils.js");
    const first = seededRandom();
    const second = seededRandom();
    const expected = (start, count) => {
      const out = [];
      let s = start;
      for (let i = 0; i < count; i++) {
        const x = Math.sin(s++) * 10000;
        out.push(x - Math.floor(x));
      }
      return out;
    };
    const [e1, e2] = expected(5, 2);
    expect(first).toBeCloseTo(e1);
    expect(second).toBeCloseTo(e2);
    expect(localStorage.getItem("battleCLI.seed")).toBe("5");
  });

  it("changing seed does not auto-start", async () => {
    const mod = await loadBattleCLI(0);
    await mod.__test.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent.mockClear();
    const input = document.getElementById("seed-input");
    input.value = "12";
    input.dispatchEvent(new Event("change"));
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
  });
});
