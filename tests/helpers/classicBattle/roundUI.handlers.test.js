import { describe, it, expect, vi } from "vitest";

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
vi.mock("../../../src/helpers/classicBattle/uiService.js", () => ({
  syncScoreDisplay: vi.fn(),
  showMatchSummaryModal: vi.fn()
}));
vi.mock("../../../src/helpers/battle/index.js", () => ({
  resetStatButtons: vi.fn()
}));
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: () => 3
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
  syncResultDisplay: vi.fn()
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
  it("waits for delayed opponent prompt when timestamp is missing", async () => {
    vi.resetModules();
    const waitForDelayedOpponentPromptDisplay = vi.fn(async () => {});
    const getOpponentPromptTimestamp = vi.fn(() => NaN);
    const timer = { start: vi.fn(async () => {}) };
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
        getOpponentPromptTimestamp
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
    const timer = { start: vi.fn(async () => {}) };
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
        getOpponentPromptTimestamp
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
    const timer = { start: vi.fn(async () => {}) };
    const renderer = vi.fn();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    await startRoundCooldown(
      { timer, renderer },
      {
        seconds: 6,
        delayOpponentMessage: true,
        rendererOptions: { promptPollIntervalMs: 45 },
        waitForDelayedOpponentPromptDisplay,
        getOpponentPromptTimestamp
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
    const timer = { start: vi.fn(async () => {}) };
    const renderer = vi.fn();
    const { startRoundCooldown } = await import("../../../src/helpers/classicBattle/roundUI.js");

    await startRoundCooldown(
      { timer, renderer },
      {
        seconds: 8,
        delayOpponentMessage: true,
        rendererOptions: { promptPollIntervalMs: 33 },
        waitForDelayedOpponentPromptDisplay,
        getOpponentPromptTimestamp
      }
    );

    expect(waitForDelayedOpponentPromptDisplay).toHaveBeenCalledTimes(2);
    expect(timer.start).toHaveBeenCalledWith(8);
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

  it("shows outcome on roundResolved", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindRoundResolved();
    const { emitBattleEvent } = events;
    const store = {};
    emitBattleEvent("roundResolved", {
      store,
      result: { matchEnded: false, message: "Win", playerScore: 1, opponentScore: 0 }
    });
    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    expect(scoreboard.showMessage).toHaveBeenCalledWith("Win", { outcome: true });
  });

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
