import { describe, it, expect, afterEach, vi } from "vitest";

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
    startRound: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed"] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    setPointsToWin: vi.fn(),
    getPointsToWin: vi.fn(),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson: vi.fn().mockResolvedValue([]) }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
    autoSelectStat: vi.fn()
  }));
  window.__TEST__ = true;
  const { battleCLI } = await import("../../src/pages/index.js");
  return { handlers: battleCLI, emitBattleEvent, updateBattleStateBadge };
}

describe("battleCLI event handlers", () => {
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
    const { handlers } = await loadHandlers();
    document.body.innerHTML = '<div id="round-message"></div>';
    handlers.handleScoreboardShowMessage({ detail: "Hello" });
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    handlers.handleScoreboardClearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");
  });

  it("shows stalled message when auto-select disabled", async () => {
    const { handlers } = await loadHandlers({ autoSelect: false });
    document.body.innerHTML = '<div id="snackbar-container"></div>';
    handlers.handleStatSelectionStalled();
    expect(document.querySelector(".snackbar").textContent).toBe(
      "Stat selection stalled. Pick a stat."
    );
  });

  it("runs countdown and emits finished", async () => {
    vi.useFakeTimers();
    const { handlers, emitBattleEvent } = await loadHandlers();
    document.body.innerHTML = '<div id="snackbar-container"></div>';
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
    const { handlers } = await loadHandlers();
    document.body.innerHTML = '<div id="snackbar-container"></div>';
    handlers.handleCountdownStart({ detail: { duration: 1 } });
    handlers.handleCountdownFinished();
    expect(document.querySelector(".snackbar").textContent).toBe("");
    vi.useRealTimers();
  });

  it("updates message after round resolved", async () => {
    const { handlers } = await loadHandlers();
    document.body.innerHTML = '<div id="round-message"></div>';
    handlers.handleRoundResolved({
      detail: {
        result: { message: "Win", playerScore: 1, opponentScore: 0 },
        stat: "speed",
        playerVal: 5,
        opponentVal: 3
      }
    });
    expect(document.getElementById("round-message").textContent).toContain("Win");
  });

  it("adds play again button on match over", async () => {
    const { handlers } = await loadHandlers();
    document.body.innerHTML = '<main id="cli-main"></main>';
    handlers.handleMatchOver();
    expect(document.getElementById("play-again-button")).toBeTruthy();
  });

  it("handles battle state transitions", async () => {
    const { handlers, updateBattleStateBadge } = await loadHandlers();
    document.body.innerHTML = '<div id="snackbar-container"></div>';
    handlers.handleBattleState({ detail: { from: "a", to: "roundOver" } });
    expect(updateBattleStateBadge).toHaveBeenCalledWith("roundOver");
    expect(document.querySelector(".snackbar").textContent).toBe("Press Enter to continue");
  });
});
