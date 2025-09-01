import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Mock battle helpers and import battleCLI for testing.
 * @returns {Promise<{ mod: object, emitBattleEvent: Function }>} battle CLI module and event emitter
 * @pseudocode
 * create emitter, handlers map, and event helper functions
 * stub feature flag and battle helpers
 * dynamically import battleCLI module
 * return { mod, emitBattleEvent }
 */
async function loadBattleCLI() {
  const emitter = new EventTarget();
  const handlers = {};
  const emitBattleEvent = vi.fn((type, detail) => {
    (handlers[type] || []).forEach((h) => h({ detail }));
  });
  const onBattleEvent = vi.fn((type, handler) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(handler);
  });
  let flag = false;
  const isEnabled = vi.fn(() => flag);
  const setFlag = vi.fn(async (_, value) => {
    flag = value;
  });
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled,
    setFlag,
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

describe("battleCLI verbose toggle", () => {
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

  it("shows verbose section and logs after enabling mid-match", async () => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
    `;
    const { mod, emitBattleEvent } = await loadBattleCLI();
    await mod.__test.init();
    const section = document.getElementById("cli-verbose-section");
    const pre = document.getElementById("cli-verbose-log");
    emitBattleEvent("battleStateChange", { from: "a", to: "b" });
    expect(section.hidden).toBe(true);
    expect(pre.textContent).toBe("");
    const checkbox = document.getElementById("verbose-toggle");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await Promise.resolve();
    emitBattleEvent("battleStateChange", { from: "c", to: "d" });
    expect(section.hidden).toBe(false);
    expect(pre.textContent).toMatch(/c -> d/);
  });
});
