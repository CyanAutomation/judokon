import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
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
  vi.stubGlobal(
    "location",
    new URL(
      seed === undefined
        ? "http://localhost/battleCLI.html"
        : `http://localhost/battleCLI.html?seed=${seed}`
    )
  );
  const mod = await import("../../src/pages/battleCLI.js");
  return mod;
}

describe("battleCLI seed validation", () => {
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
      <div style="display:flex;flex-direction:column">
        <input id="seed-input" type="number" />
        <div id="seed-error"></div>
      </div>
    `;
    const machine = { dispatch: vi.fn() };
    debugHooks.exposeDebugState(
      "getClassicBattleMachine",
      vi.fn(() => machine)
    );
    window.__TEST_MACHINE__ = machine;
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
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

  it("accepts numeric seed", async () => {
    const mod = await loadBattleCLI();
    await mod.__test.init();
    const input = document.getElementById("seed-input");
    input.value = "9";
    input.dispatchEvent(new Event("change"));
    expect(localStorage.getItem("battleCLI.seed")).toBe("9");
    expect(document.getElementById("seed-error").textContent).toBe("");
  });

  it("shows error and reverts for NaN", async () => {
    const mod = await loadBattleCLI(3);
    await mod.__test.init();
    const input = document.getElementById("seed-input");
    input.value = "abc";
    input.dispatchEvent(new Event("change"));
    expect(input.value).toBe("3");
    expect(document.getElementById("seed-error").textContent).toBe("Seed must be numeric.");
    expect(localStorage.getItem("battleCLI.seed")).toBe("3");
  });

  it("clears error after recovery", async () => {
    const mod = await loadBattleCLI(3);
    await mod.__test.init();
    const input = document.getElementById("seed-input");
    input.value = "abc";
    input.dispatchEvent(new Event("change"));
    input.value = "4";
    input.dispatchEvent(new Event("change"));
    expect(document.getElementById("seed-error").textContent).toBe("");
    expect(input.value).toBe("4");
    expect(localStorage.getItem("battleCLI.seed")).toBe("4");
  });
});
