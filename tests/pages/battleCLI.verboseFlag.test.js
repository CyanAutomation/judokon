import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

async function loadBattleCLI(flagEnabled) {
  const emitter = new EventTarget();
  const handlers = {};
  const emitBattleEvent = vi.fn((type, detail) => {
    (handlers[type] || []).forEach((h) => h({ detail }));
  });
  const onBattleEvent = vi.fn((type, handler) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(handler);
  });
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi
      .fn()
      .mockResolvedValue({ featureFlags: { cliVerbose: { enabled: flagEnabled } } }),
    isEnabled: vi.fn().mockReturnValue(flagEnabled),
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
    onBattleEvent,
    emitBattleEvent
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: [] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(() => 10),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson: vi.fn().mockResolvedValue([]) }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  return { mod, emitBattleEvent };
}

describe("battleCLI verbose flag", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
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

  it("does not log state changes when cliVerbose is disabled", async () => {
    const { mod, emitBattleEvent } = await loadBattleCLI(false);
    await mod.__test.init();
    emitBattleEvent("battleStateChange", { from: "a", to: "b" });
    expect(document.getElementById("cli-verbose-log").textContent).toBe("");
  });

  it("logs state changes when cliVerbose is enabled", async () => {
    const { mod, emitBattleEvent } = await loadBattleCLI(true);
    await mod.__test.init();
    emitBattleEvent("battleStateChange", { from: "start", to: "end" });
    expect(document.getElementById("cli-verbose-log").textContent).toMatch(/start -> end/);
  });
});
