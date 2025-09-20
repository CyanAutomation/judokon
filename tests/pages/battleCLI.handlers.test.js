import { describe, it, expect, afterEach, vi } from "vitest";
import statNamesData from "../../src/data/statNames.js";

let cleanupSetAutoContinue;

async function loadHandlers({ autoSelect = false, skipCooldown = false } = {}) {
  const emitter = new EventTarget();
  const emitBattleEvent = vi.fn();
  const updateBattleStateBadge = vi.fn();
  const resetGame = vi.fn();
  const mockDispatch = vi.fn();
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
    resetGame
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
  let autoContinue = true;
  const setAutoContinue = (val) => {
    autoContinue = val !== false;
  };
  vi.doMock("../../src/helpers/classicBattle/orchestratorHandlers.js", () => ({
    setAutoContinue,
    get autoContinue() {
      return autoContinue;
    }
  }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
    autoSelectStat: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/debugHooks.js", () => ({
    readDebugState: vi.fn(() => () => ({ dispatch: mockDispatch }))
  }));
  window.__TEST__ = true;
  const { battleCLI } = await import("../../src/pages/index.js");
  return {
    handlers: battleCLI,
    emitBattleEvent,
    updateBattleStateBadge,
    resetGame,
    setAutoContinue,
    mockDispatch
  };
}

async function setupHandlers(options) {
  const result = await loadHandlers(options);
  cleanupSetAutoContinue = result.setAutoContinue;
  result.handlers.ensureCliDomForTest({ reset: true });
  await result.handlers.renderStatList();
  return result;
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
    vi.doUnmock("../../src/helpers/classicBattle/orchestratorHandlers.js");
    vi.doUnmock("../../src/helpers/classicBattle/debugHooks.js");
    if (typeof cleanupSetAutoContinue === "function") {
      cleanupSetAutoContinue(true);
      cleanupSetAutoContinue = undefined;
    }
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

  it("captures remaining selection time when paused", async () => {
    vi.useFakeTimers();
    const { handlers } = await setupHandlers();
    const countdown = document.getElementById("cli-countdown");
    countdown.dataset.remainingTime = "5";
    countdown.setAttribute("data-remaining-time", "5");
    handlers.setSelectionTimers(
      setTimeout(() => {}, 5000),
      setInterval(() => {}, 1000)
    );
    handlers.pauseTimers();
    const { selection, cooldown } = handlers.getPausedTimes();
    expect(selection).toBe(5);
    expect(cooldown).toBeNull();
    vi.useRealTimers();
  });

  it("captures remaining cooldown time when paused", async () => {
    vi.useFakeTimers();
    const { handlers } = await setupHandlers();
    handlers.handleCountdownStart({ detail: { duration: 7 } });
    const { cooldownTimer: originalTimer, cooldownInterval: originalInterval } =
      handlers.getCooldownTimers();
    clearTimeout(originalTimer);
    clearInterval(originalInterval);
    handlers.setCooldownTimers(
      setTimeout(() => {}, 7000),
      setInterval(() => {}, 1000)
    );
    handlers.pauseTimers();
    const { cooldown, selection } = handlers.getPausedTimes();
    expect(cooldown).toBe(7);
    expect(selection).toBeNull();
    vi.useRealTimers();
  });

  it("preserves remaining time when paused twice", async () => {
    vi.useFakeTimers();
    const { handlers } = await setupHandlers();
    const countdown = document.getElementById("cli-countdown");
    countdown.dataset.remainingTime = "5";
    countdown.setAttribute("data-remaining-time", "5");
    handlers.setSelectionTimers(
      setTimeout(() => {}, 5000),
      setInterval(() => {}, 1000)
    );
    handlers.handleCountdownStart({ detail: { duration: 7 } });
    const { cooldownTimer: originalTimer, cooldownInterval: originalInterval } =
      handlers.getCooldownTimers();
    clearTimeout(originalTimer);
    clearInterval(originalInterval);
    handlers.setCooldownTimers(
      setTimeout(() => {}, 7000),
      setInterval(() => {}, 1000)
    );
    handlers.pauseTimers();
    handlers.pauseTimers();
    const { selection, cooldown } = handlers.getPausedTimes();
    expect(selection).toBe(5);
    expect(cooldown).toBe(7);
    vi.useRealTimers();
  });

  it("buildStatRows returns empty array when stats missing", async () => {
    const { handlers } = await setupHandlers();
    const rows = handlers.buildStatRows([], {});
    expect(rows).toHaveLength(0);
  });

  it("buildStatRows omits missing judoka values", async () => {
    const { handlers } = await setupHandlers();
    const stats = [{ statIndex: 1, name: "Power" }];
    const rows = handlers.buildStatRows(stats, { stats: {} });
    expect(rows[0].textContent).toBe("[1] Power");
  });

  it("buildStatRows includes judoka values when present", async () => {
    const { handlers } = await setupHandlers();
    const stats = [{ statIndex: 1, name: "Power" }];
    const rows = handlers.buildStatRows(stats, { stats: { power: 7 } });
    expect(rows[0].textContent).toBe("[1] Power: 7");
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

  it("adds play again button and lobby link on match over", async () => {
    const { handlers } = await setupHandlers();
    const home = document.createElement("a");
    home.dataset.testid = "home-link";
    home.href = "/index.html";
    document.body.appendChild(home);
    handlers.handleMatchOver();
    expect(document.getElementById("play-again-button")).toBeTruthy();
    expect(document.getElementById("return-to-lobby-link")).toBeTruthy();
  });

  it("clears verbose log on new match start", async () => {
    const { handlers } = await setupHandlers();
    document.getElementById("cli-verbose-log").textContent = "old";
    handlers.handleBattleState({ detail: { from: "roundOver", to: "matchStart" } });
    expect(document.getElementById("cli-verbose-log").textContent).toBe("");
  });

  it("clears verbose log when play again clicked", async () => {
    const { handlers, emitBattleEvent, resetGame } = await setupHandlers();
    document.getElementById("cli-verbose-log").textContent = "old";
    handlers.handleMatchOver();
    const btn = document.getElementById("play-again-button");
    btn.click();
    await new Promise((r) => setTimeout(r));
    expect(document.getElementById("cli-verbose-log").textContent).toBe("");
    expect(resetGame).toHaveBeenCalled();
    expect(emitBattleEvent).toHaveBeenCalledWith("startClicked");
  });

  it("handles battle state transitions", async () => {
    const { handlers, updateBattleStateBadge, setAutoContinue } = await setupHandlers();
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "a", to: "roundOver" } });
    expect(updateBattleStateBadge).toHaveBeenCalledWith("roundOver");
    expect(document.querySelector(".snackbar").textContent).toBe("Press Enter to continue");
  });

  it("renders next-round-button only during roundOver", async () => {
    const { handlers, setAutoContinue } = await setupHandlers();
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "waiting", to: "roundOver" } });
    const firstBtn = document.getElementById("next-round-button");
    expect(firstBtn).toBeTruthy();
    handlers.handleBattleState({
      detail: { from: "roundOver", to: "waitingForPlayerAction" }
    });
    expect(document.getElementById("next-round-button")).toBeFalsy();
    handlers.handleBattleState({
      detail: { from: "waitingForPlayerAction", to: "roundOver" }
    });
    const secondBtn = document.getElementById("next-round-button");
    expect(secondBtn).toBeTruthy();
    expect(secondBtn.id).toBe("next-round-button");
    expect(secondBtn).not.toBe(firstBtn);
  });

  it("creates next-round button when round over", async () => {
    const { handlers, setAutoContinue } = await setupHandlers();
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "x", to: "roundOver" } });
    expect(document.getElementById("next-round-button")).toBeTruthy();
  });

  it("logs state changes based on verbose flag", async () => {
    const { handlers } = await setupHandlers();
    const pre = document.getElementById("cli-verbose-log");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    handlers.setVerboseEnabled(false);
    handlers.handleBattleState({ detail: { from: "a", to: "b" } });
    expect(pre.textContent).toBe("");
    expect(spy).not.toHaveBeenCalled();
    spy.mockClear();
    handlers.setVerboseEnabled(true);
    handlers.handleBattleState({ detail: { from: "b", to: "c" } });
    expect(pre.textContent).toMatch(/b -> c/);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("advances round over on background click", async () => {
    const { handlers, mockDispatch } = await setupHandlers();
    document.body.dataset.battleState = "roundOver";
    handlers.onClickAdvance({ target: document.body });
    expect(mockDispatch).toHaveBeenCalledWith("continue");
  });

  it("clears cooldown timers and dispatches ready", async () => {
    const { handlers, mockDispatch } = await setupHandlers();
    document.body.dataset.battleState = "cooldown";
    handlers.setCooldownTimers(
      setTimeout(() => {}, 0),
      setInterval(() => {}, 100)
    );
    handlers.handleCountdownStart({ detail: { duration: 3 } });
    const { cooldownTimer: originalTimer, cooldownInterval: originalInterval } =
      handlers.getCooldownTimers();
    clearTimeout(originalTimer);
    clearInterval(originalInterval);
    handlers.onClickAdvance({ target: document.body });
    expect(mockDispatch).toHaveBeenCalledWith("ready");
    expect(handlers.getCooldownTimers()).toEqual({
      cooldownTimer: null,
      cooldownInterval: null
    });
    expect(document.querySelector(".snackbar").textContent).toBe("");
  });

  it("ignores clicks on stat elements", async () => {
    const { handlers, mockDispatch } = await setupHandlers();
    document.body.dataset.battleState = "roundOver";
    const stat = document.createElement("div");
    stat.className = "cli-stat";
    document.getElementById("cli-stats").appendChild(stat);
    handlers.onClickAdvance({ target: stat });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
