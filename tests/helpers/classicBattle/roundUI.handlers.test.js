import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  showMessage: vi.fn(),
  updateScore: vi.fn(),
  clearRoundCounter: vi.fn(),
  updateRoundCounter: vi.fn()
}));
vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn(),
  isOrchestrated: () => false
}));
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/matchSummaryModal.js", () => ({
  showMatchSummaryModal: vi.fn()
}));
vi.mock("../../../src/helpers/battle/index.js", () => ({
  resetStatButtons: vi.fn()
}));
const computeNextRoundCooldownMock = vi.fn(() => 3);
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: computeNextRoundCooldownMock
}));

const snackbarMock = {
  showSelectionPrompt: vi.fn(),
  getOpponentDelay: vi.fn(() => 0)
};
vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => snackbarMock);
const opponentPromptTrackerMock = {
  getOpponentPromptTimestamp: vi.fn(() => 0),
  getOpponentPromptMinDuration: vi.fn(() => 0)
};
vi.mock(
  "../../../src/helpers/classicBattle/opponentPromptTracker.js",
  () => opponentPromptTrackerMock
);
vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  startTimer: vi.fn(),
  handleStatSelectionTimeout: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
  handleStatSelection: vi.fn(),
  validateAndApplySelection: vi.fn(),
  dispatchStatSelected: vi.fn(),
  resolveWithFallback: vi.fn(),
  syncResultDisplay: vi.fn(),
  isOrchestratorActive: vi.fn(() => false)
}));
vi.mock("../../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: () => 0
}));
vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  getOpponentJudoka: () => ({ stats: {} })
}));

describe("resolveCooldownDependencies", () => {
  it("returns provided timer and renderer overrides", async () => {
    vi.resetModules();
    const timer = { start: vi.fn() };
    const createRoundTimer = vi.fn(() => timer);
    const attachCooldownRenderer = vi.fn();
    const { resolveCooldownDependencies } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );

    const resolved = await resolveCooldownDependencies(
      {},
      {
        createRoundTimer,
        attachCooldownRenderer
      }
    );

    expect(resolved.timer).toBe(timer);
    expect(resolved.renderer).toBe(attachCooldownRenderer);
    expect(createRoundTimer).toHaveBeenCalledTimes(1);
  });

  it("returns null timer when the factory throws", async () => {
    vi.resetModules();
    const createRoundTimer = vi.fn(() => {
      throw new Error("factory boom");
    });
    const { resolveCooldownDependencies } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );

    const resolved = await resolveCooldownDependencies({}, { createRoundTimer });

    expect(resolved.timer).toBeNull();
    expect(createRoundTimer).toHaveBeenCalledTimes(1);
  });
});

describe("startRoundCooldown", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(() => {
    timers?.runOnlyPendingTimers();
    timers?.cleanup();
  });
  function createCooldownTimer(startImpl = async () => {}) {
    return {
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(startImpl)
    };
  }

  function createAbortedSignal() {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }

  it("waits for delayed opponent prompt when timestamp is missing", async () => {
    vi.resetModules();
    const waitForDelayedOpponentPromptDisplay = vi.fn(async () => {});
    const getOpponentPromptTimestamp = vi.fn(() => NaN);
    const timer = createCooldownTimer();
    const renderer = vi.fn();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    await startRoundCooldown(
      { timer, renderer },
      {
        seconds: 5,
        delayOpponentMessage: true,
        rendererOptions: { promptPollIntervalMs: 90 },
        promptBudget: { bufferMs: 50, totalMs: 190 },
        waitForDelayedOpponentPromptDisplay,
        getOpponentPromptTimestamp,
        abortSignal: createAbortedSignal()
      }
    );

    expect(renderer).toHaveBeenCalledWith(
      timer,
      5,
      expect.objectContaining({ promptPollIntervalMs: 90 })
    );
    expect(waitForDelayedOpponentPromptDisplay).toHaveBeenCalledWith(
      { bufferMs: 50, totalMs: 190 },
      { intervalMs: 90 }
    );
    expect(timer.start).toHaveBeenCalledWith(5);
  });

  it("skips waiting when opponent prompt timestamp is already recorded", async () => {
    vi.resetModules();
    const waitForDelayedOpponentPromptDisplay = vi.fn(async () => {});
    const getOpponentPromptTimestamp = vi.fn(() => Date.now());
    const timer = createCooldownTimer();
    const renderer = vi.fn();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    await startRoundCooldown(
      { timer, renderer },
      {
        seconds: 7,
        delayOpponentMessage: true,
        rendererOptions: { promptPollIntervalMs: 60 },
        promptBudget: null,
        waitForDelayedOpponentPromptDisplay,
        getOpponentPromptTimestamp,
        abortSignal: createAbortedSignal()
      }
    );

    expect(waitForDelayedOpponentPromptDisplay).not.toHaveBeenCalled();
    expect(timer.start).toHaveBeenCalledWith(7);
  });

  it("waits for opponent prompt when timestamp retrieval throws", async () => {
    vi.resetModules();
    const waitForDelayedOpponentPromptDisplay = vi.fn(async () => {});
    const getOpponentPromptTimestamp = vi.fn(() => {
      throw new Error("timestamp fail");
    });
    const timer = createCooldownTimer();
    const renderer = vi.fn();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    await startRoundCooldown(
      { timer, renderer },
      {
        seconds: 6,
        delayOpponentMessage: true,
        rendererOptions: { promptPollIntervalMs: 45 },
        waitForDelayedOpponentPromptDisplay,
        getOpponentPromptTimestamp,
        abortSignal: createAbortedSignal()
      }
    );

    expect(waitForDelayedOpponentPromptDisplay).toHaveBeenCalledWith(undefined, { intervalMs: 45 });
    expect(timer.start).toHaveBeenCalledWith(6);
  });

  it("retries waiting once when the wait helper rejects", async () => {
    vi.resetModules();
    const waitForDelayedOpponentPromptDisplay = vi
      .fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockResolvedValueOnce(undefined);
    const getOpponentPromptTimestamp = vi.fn(() => NaN);
    const timer = createCooldownTimer();
    const renderer = vi.fn();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    await startRoundCooldown(
      { timer, renderer },
      {
        seconds: 8,
        delayOpponentMessage: true,
        rendererOptions: { promptPollIntervalMs: 33 },
        waitForDelayedOpponentPromptDisplay,
        getOpponentPromptTimestamp,
        abortSignal: createAbortedSignal()
      }
    );

    expect(waitForDelayedOpponentPromptDisplay).toHaveBeenCalledTimes(2);
    expect(timer.start).toHaveBeenCalledWith(8);
  });
  it("does not emit recovery reset when round starts at cooldown completion", async () => {
    vi.resetModules();
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const bus = events.__resetBattleEventTarget();
    const emitSpy = vi.spyOn(events, "emitBattleEvent");
    const timer = createCooldownTimer(async () => {
      bus.emit("roundStarted", { round: 2 });
    });
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    const cooldownPromise = startRoundCooldown({ timer, renderer: vi.fn() }, { seconds: 1 });
    await timers.advanceTimersByTimeAsync(2000);
    await cooldownPromise;

    expect(emitSpy).not.toHaveBeenCalledWith("game:reset-ui", {});
  });

  it("emits recovery reset once when round never starts", async () => {
    vi.resetModules();
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const emitSpy = vi.spyOn(events, "emitBattleEvent");
    const timer = createCooldownTimer();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    const cooldownPromise = startRoundCooldown({ timer, renderer: vi.fn() }, { seconds: 1 });
    await timers.advanceTimersByTimeAsync(1300);
    await cooldownPromise;

    const resetCalls = emitSpy.mock.calls.filter(
      ([eventName, detail]) => eventName === "game:reset-ui" && JSON.stringify(detail) === "{}"
    );
    expect(resetCalls).toHaveLength(1);
  });

  it("rebinds roundStarted listener when active battle bus changes before recovery wait", async () => {
    vi.resetModules();
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const initialBus = events.__resetBattleEventTarget();
    const initialTarget = initialBus.getTarget();
    const initialAddSpy = vi.spyOn(initialTarget, "addEventListener");
    const initialRemoveSpy = vi.spyOn(initialTarget, "removeEventListener");
    const emitSpy = vi.spyOn(events, "emitBattleEvent");
    let replacementBus = null;
    const timer = createCooldownTimer(async () => {
      replacementBus = events.createBattleEventBus();
      events.setActiveBattleEventBus(replacementBus);
      setTimeout(() => {
        replacementBus.emit("roundStarted", { round: 2 });
      }, 0);
    });
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    const cooldownPromise = startRoundCooldown({ timer, renderer: vi.fn() }, { seconds: 1 });
    await timers.advanceTimersByTimeAsync(1);
    await cooldownPromise;

    expect(replacementBus).toBeTruthy();
    expect(initialAddSpy).toHaveBeenCalledWith("roundStarted", expect.any(Function));
    expect(initialRemoveSpy).toHaveBeenCalledWith("roundStarted", expect.any(Function));
    expect(emitSpy).not.toHaveBeenCalledWith("game:reset-ui", {});
  });

  it("cancels pending recovery timeout and listener on teardown abort", async () => {
    vi.resetModules();
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const bus = events.__resetBattleEventTarget();
    const addSpy = vi.spyOn(bus.getTarget(), "addEventListener");
    const removeSpy = vi.spyOn(bus.getTarget(), "removeEventListener");
    const emitSpy = vi.spyOn(events, "emitBattleEvent");
    const controller = new AbortController();
    const timer = createCooldownTimer(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            controller.abort();
            resolve();
          }, 10);
        })
    );
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    const cooldownPromise = startRoundCooldown(
      { timer, renderer: vi.fn() },
      { seconds: 5, abortSignal: controller.signal }
    );

    await timers.advanceTimersByTimeAsync(20);
    await cooldownPromise;
    await timers.advanceTimersByTimeAsync(6000);

    expect(addSpy).toHaveBeenCalledWith("roundStarted", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("roundStarted", expect.any(Function));
    expect(emitSpy).not.toHaveBeenCalledWith("game:reset-ui", {});
  });
});

describe("round UI handlers", () => {
  it("calls applyRoundUI on roundStarted", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindRoundStarted();
    const { emitBattleEvent } = events;
    document.body.innerHTML =
      '<div id="player-card"></div><div id="opponent-card"></div><div id="stat-buttons"><button data-stat="power"></button></div><div id="round-result"></div>';
    const store = {};
    emitBattleEvent("roundStarted", { store, roundNumber: 2 });
    expect(store.playerCardEl).toBeTruthy();
    expect(store.statButtonEls?.power).toBeTruthy();
  });

  it("highlights selected stat button", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindStatSelected();
    const { emitBattleEvent } = events;
    document.body.innerHTML = '<div id="stat-buttons"><button data-stat="power"></button></div>';
    const btn = document.querySelector('[data-stat="power"]');
    const store = { statButtonEls: { power: btn } };
    emitBattleEvent("statSelected", { stat: "power", store });
    expect(btn.classList.contains("selected")).toBe(true);
  });

  it("shows outcome on round.evaluated", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindRoundResolved();
    const { emitBattleEvent } = events;
    const store = {};
    emitBattleEvent("round.evaluated", {
      store,
      matchEnded: false,
      message: "Win",
      scores: { player: 1, opponent: 0 }
    });
    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    expect(scoreboard.showMessage).toHaveBeenCalledWith("Win", { outcome: true });
  });

  it("ignores round.evaluated events with malformed result payloads", async () => {
    vi.resetModules();
    const createRoundTimer = vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(async () => {})
    }));
    const roundUI = await import("../../../src/helpers/classicBattle/roundUI.js");

    await roundUI.handleRoundResolvedEvent(
      {
        detail: {
          store: {},
          result: {}
        }
      },
      {
        createRoundTimer
      }
    );

    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    expect(scoreboard.updateScore).not.toHaveBeenCalled();
    expect(createRoundTimer).not.toHaveBeenCalled();
  });

  it("ignores result payloads with empty message fields", async () => {
    vi.resetModules();
    const createRoundTimer = vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(async () => {})
    }));
    const roundUI = await import("../../../src/helpers/classicBattle/roundUI.js");

    await roundUI.handleRoundResolvedEvent(
      {
        detail: {
          store: {},
          result: {
            message: ""
          }
        }
      },
      {
        createRoundTimer
      }
    );

    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    expect(scoreboard.updateScore).not.toHaveBeenCalled();
    expect(createRoundTimer).not.toHaveBeenCalled();
  });

  it("accepts result payloads that include score fields", async () => {
    vi.resetModules();
    const createRoundTimer = vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(async () => {})
    }));
    const roundUI = await import("../../../src/helpers/classicBattle/roundUI.js");

    await roundUI.handleRoundResolvedEvent(
      {
        detail: {
          store: {},
          result: {
            playerScore: 2,
            opponentScore: 1,
            matchEnded: false,
            message: "Round won"
          }
        }
      },
      {
        createRoundTimer
      }
    );

    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    expect(scoreboard.updateScore).toHaveBeenCalledWith(2, 1);
    expect(createRoundTimer).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["undefined", undefined],
    ["NaN", { seconds: NaN }]
  ])(
    "defaults to minimum cooldown when computeNextRoundCooldown returns %s",
    async (_, cooldownResult) => {
      vi.resetModules();
      computeNextRoundCooldownMock.mockReset();
      computeNextRoundCooldownMock.mockReturnValueOnce(cooldownResult);
      computeNextRoundCooldownMock.mockReturnValue(3);
      const attachCooldownRenderer = vi.fn(() => () => {});
      const createRoundTimer = vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        start: vi.fn(async () => {})
      }));
      const roundUI = await import("../../../src/helpers/classicBattle/roundUI.js");

      await roundUI.handleRoundResolvedEvent(
        {
          detail: {
            store: {},
            result: { matchEnded: false, message: "", playerScore: 0, opponentScore: 0 }
          }
        },
        {
          attachCooldownRenderer,
          createRoundTimer
        }
      );

      expect(createRoundTimer).toHaveBeenCalledTimes(1);
      expect(computeNextRoundCooldownMock).toHaveBeenCalledTimes(1);
      const timer = createRoundTimer.mock.results[0]?.value;
      expect(timer?.start).toHaveBeenCalledWith(3);
      const attachCall = attachCooldownRenderer.mock.calls[0];
      expect(attachCall?.[1]).toBe(3);
    }
  );

  it("uses shared opponent prompt buffer when scheduling cooldown", async () => {
    vi.resetModules();
    snackbarMock.getOpponentDelay.mockReturnValue(120);
    opponentPromptTrackerMock.getOpponentPromptMinDuration.mockReturnValue(380);
    opponentPromptTrackerMock.getOpponentPromptTimestamp.mockReturnValue(42);
    const attachCooldownRenderer = vi.fn(() => () => {});
    const createRoundTimer = vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(async () => {})
    }));
    const { handleRoundResolvedEvent, DEFAULT_OPPONENT_PROMPT_BUFFER_MS } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    await handleRoundResolvedEvent(
      {
        detail: {
          store: { __delayOpponentMessage: true },
          result: { matchEnded: false, message: "", playerScore: 0, opponentScore: 0 }
        }
      },
      {
        attachCooldownRenderer,
        createRoundTimer
      }
    );
    expect(attachCooldownRenderer).toHaveBeenCalledTimes(1);
    const [, , options] = attachCooldownRenderer.mock.calls[0];
    expect(options).toMatchObject({
      waitForOpponentPrompt: true,
      opponentPromptBufferMs: DEFAULT_OPPONENT_PROMPT_BUFFER_MS,
      maxPromptWaitMs: 120 + 380 + DEFAULT_OPPONENT_PROMPT_BUFFER_MS,
      promptPollIntervalMs: 75
    });
  });

  it("allows overriding the opponent prompt buffer via renderer options", async () => {
    vi.resetModules();
    snackbarMock.getOpponentDelay.mockReturnValue(0);
    opponentPromptTrackerMock.getOpponentPromptMinDuration.mockReturnValue(0);
    opponentPromptTrackerMock.getOpponentPromptTimestamp.mockReturnValue(99);
    const attachCooldownRenderer = vi.fn(() => () => {});
    const createRoundTimer = vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(async () => {})
    }));
    const { handleRoundResolvedEvent } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    await handleRoundResolvedEvent(
      {
        detail: {
          store: { __delayOpponentMessage: true },
          result: { matchEnded: false, message: "", playerScore: 0, opponentScore: 0 }
        }
      },
      {
        attachCooldownRenderer,
        createRoundTimer,
        attachCooldownRendererOptions: { opponentPromptBufferMs: 90, promptPollIntervalMs: 48 }
      }
    );
    const [, , options] = attachCooldownRenderer.mock.calls[0];
    expect(options).toMatchObject({
      waitForOpponentPrompt: true,
      opponentPromptBufferMs: 90,
      maxPromptWaitMs: 90,
      promptPollIntervalMs: 50
    });
  });

  it("accepts prompt buffer overrides returned from computeNextRoundCooldown", async () => {
    vi.resetModules();
    snackbarMock.getOpponentDelay.mockReturnValue(0);
    opponentPromptTrackerMock.getOpponentPromptMinDuration.mockReturnValue(0);
    opponentPromptTrackerMock.getOpponentPromptTimestamp.mockReturnValue(50);
    const attachCooldownRenderer = vi.fn(() => () => {});
    const createRoundTimer = vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      start: vi.fn(async () => {})
    }));
    const computeNextRoundCooldown = vi.fn(() => ({
      seconds: 4,
      opponentPromptBufferMs: 75
    }));
    const { handleRoundResolvedEvent } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    await handleRoundResolvedEvent(
      {
        detail: {
          store: { __delayOpponentMessage: true },
          result: { matchEnded: false, message: "", playerScore: 0, opponentScore: 0 }
        }
      },
      {
        attachCooldownRenderer,
        createRoundTimer,
        computeNextRoundCooldown
      }
    );
    const [, , options] = attachCooldownRenderer.mock.calls[0];
    expect(options).toMatchObject({
      waitForOpponentPrompt: true,
      opponentPromptBufferMs: 75,
      maxPromptWaitMs: 75,
      promptPollIntervalMs: 75
    });
    expect(computeNextRoundCooldown).toHaveBeenCalledTimes(1);
  });
});
