import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";

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
    startRound: vi.fn().mockResolvedValue({ playerJudoka: null, roundNumber: 2 }),
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
    getPointsToWin: vi.fn().mockReturnValue(10),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
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
      <div id="cli-root"></div>
      <div id="cli-stats"></div>
      <div id="cli-round"></div>
      <div id="round-message"></div>
      <div id="cli-countdown"></div>
      <div id="cli-score"></div>
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
    expect(document.getElementById("cli-round").textContent).toBe("Round 2 Target: 10 🏆");
    const root = document.getElementById("cli-root");
    expect(root.dataset.round).toBe("2");
    expect(root.dataset.target).toBe("10");
  });

  it("battleCLI.html exposes required selectors", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("#cli-countdown")).toBeTruthy();
    expect(doc.querySelector("#round-message")).toBeTruthy();
    expect(doc.querySelector("#cli-score")).toBeTruthy();
    const root = doc.querySelector("#cli-root");
    expect(root?.getAttribute("data-round")).not.toBeNull();
    expect(root?.getAttribute("data-target")).not.toBeNull();
    expect(doc.querySelector("#cli-countdown")?.getAttribute("data-remaining-time")).not.toBeNull();
  });
});
