import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { waitFor } from "../waitFor.js";

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
  let points = 10;
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn((v) => {
      points = v;
    }),
    getPointsToWin: vi.fn(() => points),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([{ statIndex: 1, name: "Speed" }])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  const mod = await import("../../src/pages/battleCLI.js");
  return mod;
}

describe("battleCLI verbose win target", () => {
  beforeEach(() => {
    window.__TEST__ = true;
    document.body.innerHTML = `
      <main id="cli-main"></main>
      <div id="cli-root"></div>
      <div id="cli-round"></div>
      <div id="cli-stats"></div>
      <div id="cli-help"></div>
      <select id="points-select">
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="15">15</option>
      </select>
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
    `;
    const machine = { dispatch: vi.fn() };
    debugHooks.exposeDebugState(
      "getClassicBattleMachine",
      vi.fn(() => machine)
    );
    window.__TEST_MACHINE__ = machine;
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
  });

  it("keeps win target when verbose toggled", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    await mod.__test.init();
    const select = document.getElementById("points-select");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    select.value = "15";
    select.dispatchEvent(new Event("change"));
    await waitFor(
      () => document.getElementById("cli-round").textContent === "Round 0 Target: 15 🏆"
    );
    const { getPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    expect(getPointsToWin()).toBe(15);
    const checkbox = document.getElementById("verbose-toggle");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await waitFor(
      () => document.getElementById("cli-round").textContent === "Round 0 Target: 15 🏆"
    );
    expect(getPointsToWin()).toBe(15);
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    await waitFor(
      () => document.getElementById("cli-round").textContent === "Round 0 Target: 15 🏆"
    );
    expect(getPointsToWin()).toBe(15);
  });
});
