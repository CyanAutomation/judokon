import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const statNamesData = JSON.parse(
  readFileSync(join(__dirname, "../../src/data/statNames.json"), "utf8")
);

async function loadHandlers({ autoSelect = false, skipCooldown = false } = {}) {
  const emitter = new EventTarget();
  const emitBattleEvent = vi.fn();
  const updateBattleStateBadge = vi.fn();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn((flag) => (flag === "autoSelect" ? autoSelect : false)),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
    skipRoundCooldownIfEnabled: vi.fn(() => skipCooldown),
    updateBattleStateBadge
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn(),
    resetGame: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({
    STATS: ["power", "speed", "technique", "kumikata", "newaza"]
  }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockImplementation(async (path) => {
      return path.includes("statNames.json") ? statNamesData : [];
    })
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
    autoSelectStat: vi.fn()
  }));
  window.__TEST__ = true;
  const { battleCLI } = await import("../../src/pages/index.js");
  return { handlers: battleCLI, emitBattleEvent, updateBattleStateBadge };
}

async function setupHandlers(options) {
  const result = await loadHandlers(options);
  await result.handlers.renderStatList();
  return result;
}

describe("battleCLI event handlers", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="cli-stats"></div>' +
      '<ul id="cli-help"></ul>' +
      '<div id="round-message"></div>' +
      '<div id="snackbar-container"></div>' +
      '<main id="cli-main"></main>' +
      '<pre id="cli-verbose-log"></pre>';
  });
  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
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

  it("updates round message on scoreboard event", async () => {
    const { handlers } = await setupHandlers();
    handlers.handleScoreboardShowMessage({ detail: "Hello" });
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    handlers.handleScoreboardClearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");
  });

  it("shows stalled message when auto-select disabled", async () => {
    const { handlers } = await setupHandlers({ autoSelect: false });
    handlers.handleStatSelectionStalled();
    expect(document.querySelector(".snackbar").textContent).toBe(
      "Stat selection stalled. Pick a stat."
    );
  });

  it("runs countdown and emits finished", async () => {
    vi.useFakeTimers();
    const { handlers, emitBattleEvent } = await setupHandlers();
    handlers.handleCountdownStart({ detail: { duration: 2 } });
    expect(document.querySelector(".snackbar").textContent).toBe("Next round in: 2");
    vi.advanceTimersByTime(1000);
    expect(document.querySelector(".snackbar").textContent).toBe("Next round in: 1");
    vi.advanceTimersByTime(1000);
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownFinished");
    vi.useRealTimers();
  });

  it("clears countdown on finish", async () => {
    vi.useFakeTimers();
    const { handlers } = await setupHandlers();
    handlers.handleCountdownStart({ detail: { duration: 1 } });
    handlers.handleCountdownFinished();
    expect(document.querySelector(".snackbar").textContent).toBe("");
    vi.useRealTimers();
  });

  it("updates message after round resolved", async () => {
    const { handlers } = await setupHandlers();
    const speedName = statNamesData.find((s) => s.statIndex === 2).name;
    handlers.handleRoundResolved({
      detail: {
        result: { message: "Win", playerScore: 1, opponentScore: 0 },
        stat: "speed",
        playerVal: 5,
        opponentVal: 3
      }
    });
    const msg = document.getElementById("round-message").textContent;
    expect(msg).toContain("Win");
    expect(msg).toContain(speedName);
  });

  it("displays hyphenated stat names", async () => {
    const { handlers } = await setupHandlers();
    const kumikataName = statNamesData.find((s) => s.statIndex === 4).name;
    handlers.handleRoundResolved({
      detail: {
        result: { message: "Win", playerScore: 1, opponentScore: 0 },
        stat: "kumikata",
        playerVal: 5,
        opponentVal: 3
      }
    });
    expect(document.getElementById("round-message").textContent).toContain(kumikataName);
  });

  it("adds play again button on match over", async () => {
    const { handlers } = await setupHandlers();
    handlers.handleMatchOver();
    expect(document.getElementById("play-again-button")).toBeTruthy();
  });

  it("clears verbose log on new match start", async () => {
    const { handlers } = await setupHandlers();
    document.getElementById("cli-verbose-log").textContent = "old";
    handlers.handleBattleState({ detail: { from: "roundOver", to: "matchStart" } });
    expect(document.getElementById("cli-verbose-log").textContent).toBe("");
  });

  it("clears verbose log when play again clicked", async () => {
    const { handlers, emitBattleEvent } = await setupHandlers();
    document.getElementById("cli-verbose-log").textContent = "old";
    handlers.handleMatchOver();
    const btn = document.getElementById("play-again-button");
    const { resetGame } = await import("../../src/helpers/classicBattle/roundManager.js");
    btn.click();
    await new Promise((r) => setTimeout(r));
    expect(document.getElementById("cli-verbose-log").textContent).toBe("");
    expect(resetGame).toHaveBeenCalled();
    expect(emitBattleEvent).toHaveBeenCalledWith("startClicked");
  });

  it("handles battle state transitions", async () => {
    const { handlers, updateBattleStateBadge } = await setupHandlers();
    const { setAutoContinue } = await import(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "a", to: "roundOver" } });
    expect(updateBattleStateBadge).toHaveBeenCalledWith("roundOver");
    expect(document.querySelector(".snackbar").textContent).toBe("Press Enter to continue");
  });
});
