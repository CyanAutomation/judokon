import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

async function loadBattleCLI(flagEnabled) {
  const emitter = new EventTarget();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi
      .fn()
      .mockResolvedValue({ featureFlags: { cliShortcuts: { enabled: flagEnabled } } }),
    isEnabled: vi.fn((flag) => (flag === "cliShortcuts" ? flagEnabled : false)),
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
  vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson: vi.fn().mockResolvedValue([]) }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  return mod;
}

describe("battleCLI cliShortcuts flag", () => {
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
      <section id="cli-shortcuts" hidden><button id="cli-shortcuts-close"></button></section>
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

  it("does not toggle when cliShortcuts is disabled", async () => {
    const mod = await loadBattleCLI(false);
    await mod.__test.init();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    mod.onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(true);
  });

  it("toggles when cliShortcuts is enabled", async () => {
    const mod = await loadBattleCLI(true);
    await mod.__test.init();
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(true);
    mod.onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(false);
  });
});
