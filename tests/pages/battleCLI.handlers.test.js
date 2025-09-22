import { describe, it, expect, afterEach, vi } from "vitest";
import statNamesData from "../../src/data/statNames.js";

let cleanupSetAutoContinue;
let cleanupBattleStateListener;

async function loadHandlers({ autoSelect = false, skipCooldown = false } = {}) {
  const emitter = new EventTarget();
  const battleBus = new EventTarget();
  const onBattleEvent = vi.fn((type, handler) => {
    try {
      battleBus.addEventListener(type, handler);
    } catch {}
  });
  const offBattleEvent = vi.fn((type, handler) => {
    try {
      battleBus.removeEventListener(type, handler);
    } catch {}
  });
  const emitBattleEvent = vi.fn((type, detail) => {
    try {
      battleBus.dispatchEvent(new CustomEvent(type, { detail }));
    } catch {}
  });
  const updateBattleStateBadge = vi.fn();
  const resetGame = vi.fn();
  const mockDispatch = vi.fn();
  const buttonClickHandlers = [];
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn((flag) => (flag === "autoSelect" ? autoSelect : false)),
    setFlag: vi.fn(),
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
    skipRoundCooldownIfEnabled: vi.fn(({ onSkip }) => {
      if (!skipCooldown) return false;
      onSkip?.();
      return true;
    }),
    updateBattleStateBadge
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent,
    offBattleEvent,
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
  vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
    createRoundTimer: vi.fn(() => {
      const listeners = {
        tick: new Set(),
        expired: new Set(),
        drift: new Set()
      };
      return {
        start: vi.fn(),
        stop: vi.fn(),
        on: vi.fn((event, handler) => {
          listeners[event]?.add(handler);
          return () => listeners[event]?.delete(handler);
        }),
        off: vi.fn((event, handler) => listeners[event]?.delete(handler))
      };
    })
  }));
  vi.doMock("../../src/components/Button.js", () => ({
    createButton: vi.fn((label, options = {}) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (options.id) btn.id = options.id;
      if (options.className) btn.className = options.className;
      const originalAdd = btn.addEventListener.bind(btn);
      btn.addEventListener = vi.fn((event, handler, opts) => {
        if (event === "click" && typeof handler === "function") {
          buttonClickHandlers.push({
            button: btn,
            handler,
            label,
            id: options.id
          });
        }
        return originalAdd(event, handler, opts);
      });
      return btn;
    })
  }));
  window.__TEST__ = true;
  const { battleCLI } = await import("../../src/pages/index.js");
  return {
    handlers: battleCLI,
    emitBattleEvent,
    updateBattleStateBadge,
    resetGame,
    setAutoContinue,
    mockDispatch,
    buttonClickHandlers
  };
}

async function setupHandlers(options) {
  const result = await loadHandlers(options);
  cleanupSetAutoContinue = result.setAutoContinue;
  result.handlers.ensureCliDomForTest({ reset: true });
  await result.handlers.renderStatList();
  try {
    result.handlers.installEventBindings?.();
  } catch {}
  const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
  const { domStateListener } = await import(
    "../../src/helpers/classicBattle/stateTransitionListeners.js"
  );
  try {
    battleEvents.onBattleEvent("battleStateChange", domStateListener);
    cleanupBattleStateListener = () => {
      try {
        battleEvents.offBattleEvent("battleStateChange", domStateListener);
      } catch {}
      cleanupBattleStateListener = undefined;
    };
  } catch {}
  const transitionToBattleState = (to, detail = {}) => {
    result.emitBattleEvent("battleStateChange", { ...detail, to });
  };
  const getRoundMessage = () => document.getElementById("round-message")?.textContent ?? "";
  const getBottomLineText = () =>
    document.querySelector("#snackbar-container .snackbar")?.textContent ?? "";
  const getVerboseLog = () => document.getElementById("cli-verbose-log")?.textContent ?? "";
  const seedVerboseLog = (text) => {
    const el = document.getElementById("cli-verbose-log");
    if (el) el.textContent = text;
  };
  const addHomeLink = (href) => {
    const link = document.createElement("a");
    link.dataset.testid = "home-link";
    link.href = href;
    document.body.appendChild(link);
    return link;
  };
  const hasPlayAgainButton = () => Boolean(document.getElementById("play-again-button"));
  const hasLobbyLink = () => Boolean(document.getElementById("return-to-lobby-link"));
  const getLobbyLinkHref = () =>
    document.getElementById("return-to-lobby-link")?.getAttribute("href") ?? null;
  const clickPlayAgain = async () => {
    const playAgainHandler = result.buttonClickHandlers.find(
      (item) => item.id === "play-again-button" || item.label === "Play Again"
    );
    if (playAgainHandler?.handler) {
      await playAgainHandler.handler(new Event("click"));
    }
  };
  const getNextRoundButtons = () => Array.from(document.querySelectorAll("#next-round-button"));
  const appendToStats = (element) => {
    document.getElementById("cli-stats")?.appendChild(element);
    return element;
  };
  return {
    ...result,
    transitionToBattleState,
    getRoundMessage,
    getBottomLineText,
    getVerboseLog,
    seedVerboseLog,
    addHomeLink,
    hasPlayAgainButton,
    hasLobbyLink,
    getLobbyLinkHref,
    clickPlayAgain,
    getNextRoundButtons,
    appendToStats
  };
}

describe("battleCLI event handlers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete window.__TEST__;
    if (typeof cleanupBattleStateListener === "function") {
      cleanupBattleStateListener();
    }
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
    vi.doUnmock("../../src/helpers/timers/createRoundTimer.js");
    vi.doUnmock("../../src/components/Button.js");
    if (typeof cleanupSetAutoContinue === "function") {
      cleanupSetAutoContinue(true);
      cleanupSetAutoContinue = undefined;
    }
  });

  it("updates round message on scoreboard event", async () => {
    const { handlers, getRoundMessage } = await setupHandlers();
    handlers.handleScoreboardShowMessage({ detail: "Hello" });
    expect(getRoundMessage()).toBe("Hello");
    handlers.handleScoreboardClearMessage();
    expect(getRoundMessage()).toBe("");
  });

  it("shows stalled message when auto-select disabled", async () => {
    const { handlers, getBottomLineText } = await setupHandlers({ autoSelect: false });
    handlers.handleStatSelectionStalled();
    expect(getBottomLineText()).toBe("Stat selection stalled. Pick a stat.");
  });

  it("runs countdown and emits finished", async () => {
    const timers = useCanonicalTimers();
    const { handlers, emitBattleEvent, getBottomLineText } = await setupHandlers();
    handlers.handleCountdownStart({ detail: { duration: 2 } });
    expect(getBottomLineText()).toBe("Next round in: 2");
    vi.advanceTimersByTime(1000);
    expect(getBottomLineText()).toBe("Next round in: 1");
    vi.advanceTimersByTime(1000);
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownFinished");
    timers.cleanup();
  });

  it("clears countdown on finish", async () => {
    vi.useFakeTimers();
    const { handlers, getBottomLineText } = await setupHandlers();
    handlers.handleCountdownStart({ detail: { duration: 1 } });
    handlers.handleCountdownFinished();
    expect(getBottomLineText()).toBe("");
    vi.useRealTimers();
  });

  it("captures remaining selection time when paused", async () => {
    vi.useFakeTimers();
    const { handlers } = await setupHandlers();
    handlers.startSelectionCountdown(5);
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
    handlers.startSelectionCountdown(5);
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
    const { handlers, getRoundMessage } = await setupHandlers();
    const speedName = statNamesData.find((s) => s.statIndex === 2).name;
    handlers.handleRoundResolved({
      detail: {
        result: { message: "Win", playerScore: 1, opponentScore: 0 },
        stat: "speed",
        playerVal: 5,
        opponentVal: 3
      }
    });
    const msg = getRoundMessage();
    expect(msg).toContain("Win");
    expect(msg).toContain(speedName);
  });

  it("displays hyphenated stat names", async () => {
    const { handlers, getRoundMessage } = await setupHandlers();
    const kumikataName = statNamesData.find((s) => s.statIndex === 4).name;
    handlers.handleRoundResolved({
      detail: {
        result: { message: "Win", playerScore: 1, opponentScore: 0 },
        stat: "kumikata",
        playerVal: 5,
        opponentVal: 3
      }
    });
    expect(getRoundMessage()).toContain(kumikataName);
  });

  it("adds play again button and lobby link on match over", async () => {
    const { handlers, addHomeLink, hasPlayAgainButton, hasLobbyLink, getLobbyLinkHref } =
      await setupHandlers();
    addHomeLink("/index.html");
    handlers.handleMatchOver();
    expect(hasPlayAgainButton()).toBe(true);
    expect(hasLobbyLink()).toBe(true);
    expect(getLobbyLinkHref()).toContain("index.html");
  });

  it("clears verbose log on new match start", async () => {
    const { handlers, seedVerboseLog, getVerboseLog } = await setupHandlers();
    seedVerboseLog("old");
    handlers.handleBattleState({ detail: { from: "roundOver", to: "matchStart" } });
    expect(getVerboseLog()).toBe("");
  });

  it("clears verbose log when play again clicked", async () => {
    const {
      handlers,
      emitBattleEvent,
      resetGame,
      seedVerboseLog,
      getVerboseLog,
      clickPlayAgain,
      hasPlayAgainButton
    } = await setupHandlers();
    seedVerboseLog("old");
    handlers.handleMatchOver();
    expect(hasPlayAgainButton()).toBe(true);
    await clickPlayAgain();
    expect(getVerboseLog()).toBe("");
    expect(resetGame).toHaveBeenCalled();
    expect(emitBattleEvent).toHaveBeenCalledWith("startClicked");
  });

  it("handles battle state transitions", async () => {
    const { handlers, updateBattleStateBadge, setAutoContinue, getBottomLineText } =
      await setupHandlers();
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "a", to: "roundOver" } });
    expect(updateBattleStateBadge).toHaveBeenCalledWith("roundOver");
    expect(getBottomLineText()).toBe("Press Enter to continue");
  });

  it("renders next-round-button only during roundOver", async () => {
    const { handlers, setAutoContinue, getNextRoundButtons } = await setupHandlers();
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "waiting", to: "roundOver" } });
    const [firstBtn] = getNextRoundButtons();
    expect(firstBtn).toBeTruthy();
    handlers.handleBattleState({
      detail: { from: "roundOver", to: "waitingForPlayerAction" }
    });
    expect(getNextRoundButtons()).toHaveLength(0);
    handlers.handleBattleState({
      detail: { from: "waitingForPlayerAction", to: "roundOver" }
    });
    const [secondBtn] = getNextRoundButtons();
    expect(secondBtn).toBeTruthy();
    expect(secondBtn.id).toBe("next-round-button");
    expect(secondBtn).not.toBe(firstBtn);
  });

  it("creates next-round button when round over", async () => {
    const { handlers, setAutoContinue, getNextRoundButtons } = await setupHandlers();
    setAutoContinue(false);
    handlers.handleBattleState({ detail: { from: "x", to: "roundOver" } });
    expect(getNextRoundButtons()).toHaveLength(1);
  });

  it("logs state changes based on verbose flag", async () => {
    const { handlers, getVerboseLog } = await setupHandlers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    handlers.setVerboseEnabled(false);
    handlers.handleBattleState({ detail: { from: "a", to: "b" } });
    expect(getVerboseLog()).toBe("");
    expect(spy).not.toHaveBeenCalled();
    spy.mockClear();
    handlers.setVerboseEnabled(true);
    handlers.handleBattleState({ detail: { from: "b", to: "c" } });
    expect(getVerboseLog()).toMatch(/b -> c/);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("advances round over on background click", async () => {
    const { handlers, mockDispatch, transitionToBattleState } = await setupHandlers();
    transitionToBattleState("roundOver");
    handlers.onClickAdvance({ target: document.body });
    expect(mockDispatch).toHaveBeenCalledWith("continue");
  });

  it("clears cooldown timers and dispatches ready", async () => {
    const { handlers, mockDispatch, transitionToBattleState, getBottomLineText } =
      await setupHandlers();
    transitionToBattleState("cooldown");
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
    expect(getBottomLineText()).toBe("");
  });

  it("ignores clicks on stat elements", async () => {
    const { handlers, mockDispatch, transitionToBattleState, appendToStats } =
      await setupHandlers();
    transitionToBattleState("roundOver");
    const stat = document.createElement("div");
    stat.className = "cli-stat";
    appendToStats(stat);
    handlers.onClickAdvance({ target: stat });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
