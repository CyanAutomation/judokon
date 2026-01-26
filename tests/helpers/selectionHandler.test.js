import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

// Mock all dependencies before any imports
vi.mock("../../src/helpers/BattleEngine.js", () => ({
  STATS: ["power"],
  stopTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn(() => 1)
}));

vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn(async (eventName) => {
    if (eventName === "statSelected") {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  })
}));

vi.mock("../../src/helpers/classicBattle/timerUtils.js", () => ({
  resolveDelay: vi.fn(() => 0)
}));

vi.mock("../../src/helpers/classicBattle/promises.js", () => ({
  getRoundResolvedPromise: vi.fn(() => Promise.resolve())
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/i18n.js", () => ({
  t: vi.fn((k) => k)
}));

describe("handleStatSelection helpers", () => {
  let store;
  let stopTimer;
  let emitBattleEvent;
  let showSnackbar;
  let dispatchBattleEvent;
  let getBattleState;
  let timers;
  let handleStatSelection;
  let cleanupTimers;
  let setFlag;

  beforeEach(async () => {
    // Clear module cache to ensure fresh imports with mocks applied
    vi.resetModules();

    // Re-declare mocks after reset
    vi.mock("../../src/helpers/BattleEngine.js", () => ({
      STATS: ["power"],
      stopTimer: vi.fn()
    }));

    vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn(),
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));

    vi.mock("../../src/helpers/classicBattle/eventBus.js", () => ({
      getBattleState: vi.fn()
    }));

    vi.mock("../../src/helpers/classicBattle/cardStatUtils.js", () => ({
      getCardStatValue: vi.fn(() => 1)
    }));

    vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => ({
      resolveRound: vi.fn()
    }));

    vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: vi.fn(async (eventName) => {
        if (eventName === "statSelected") {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      })
    }));

    vi.mock("../../src/helpers/classicBattle/timerUtils.js", () => ({
      resolveDelay: vi.fn(() => 0)
    }));

    vi.mock("../../src/helpers/classicBattle/promises.js", () => ({
      getRoundResolvedPromise: vi.fn(() => Promise.resolve())
    }));

    vi.mock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));

    vi.mock("../../src/helpers/i18n.js", () => ({
      t: vi.fn((k) => k)
    }));

    timers = useCanonicalTimers();
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };

    // Import all modules after setting up mocks
    const battleEngineFacade = await import("../../src/helpers/BattleEngine.js");
    stopTimer = battleEngineFacade.stopTimer;

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent = battleEvents.emitBattleEvent;

    const snackbarModule = await import("../../src/helpers/showSnackbar.js");
    showSnackbar = snackbarModule.showSnackbar;

    const eventDispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    dispatchBattleEvent = eventDispatcher.dispatchBattleEvent;

    const eventBus = await import("../../src/helpers/classicBattle/eventBus.js");
    getBattleState = eventBus.getBattleState;
    getBattleState.mockReturnValue(null);

    const classicBattle = await import("../../src/helpers/classicBattle.js");
    handleStatSelection = classicBattle.handleStatSelection;

    const selectionHandlerModule = await import(
      "../../src/helpers/classicBattle/selectionHandler.js"
    );
    cleanupTimers = selectionHandlerModule.cleanupTimers;

    const featureFlags = await import("../../src/helpers/featureFlags.js");
    setFlag = featureFlags.setFlag;
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("ignores repeated selections and emits events in correct order", async () => {
    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await handleStatSelection(store, "speed", { playerVal: 3, opponentVal: 4 });

    expect(stopTimer).toHaveBeenCalledTimes(1);
    // Expect statSelected, round.selection.locked, roundReset, then input.ignored events
    expect(emitBattleEvent).toHaveBeenCalledTimes(4);
    expect(emitBattleEvent).toHaveBeenNthCalledWith(1, "statSelected", expect.any(Object));
    expect(emitBattleEvent).toHaveBeenNthCalledWith(
      2,
      "round.selection.locked",
      expect.any(Object)
    );
    expect(emitBattleEvent).toHaveBeenNthCalledWith(3, "roundReset", {
      reason: "playerSelection"
    });
    expect(emitBattleEvent).toHaveBeenNthCalledWith(4, "input.ignored", {
      kind: "duplicateSelection"
    });
    expect(dispatchBattleEvent).toHaveBeenCalledWith("roundResolved");
    expect(store.selectionMade).toBe(true);
  });

  it("preserves delayOpponentMessage overrides when feature flag enabled", async () => {
    const previousOverrides = window.__FF_OVERRIDES;
    window.__FF_OVERRIDES = { ...(previousOverrides || {}), opponentDelayMessage: true };

    try {
      await handleStatSelection(store, "power", {
        playerVal: 1,
        opponentVal: 2,
        delayOpponentMessage: false
      });
    } finally {
      if (previousOverrides === undefined) {
        delete window.__FF_OVERRIDES;
      } else {
        window.__FF_OVERRIDES = previousOverrides;
      }
    }

    const statSelectedCall = emitBattleEvent.mock.calls.find(
      ([eventName]) => eventName === "statSelected"
    );
    expect(statSelectedCall?.[1]?.opts?.delayOpponentMessage).toBe(false);
  });

  it("applies test-mode shortcuts", async () => {
    document.body.innerHTML = `
      <div id="next-round-timer">123</div>
      <div id="round-message">hi</div>
    `;

    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
    initScoreboard(document.body);

    // Mock dispatchBattleEvent to return false so direct resolution is used
    dispatchBattleEvent.mockResolvedValueOnce(false);

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(document.getElementById("next-round-timer").textContent).toBe("");
    expect(document.getElementById("round-message").textContent).toBe("");
    expect(showSnackbar).toHaveBeenCalledWith("ui.opponentChoosing");
  });

  it("clears autoSelectId even when feature flag disabled", async () => {
    // Use fake timer instead of real setTimeout
    const timeout = vi.fn();
    const timerId = setTimeout(timeout, 1000);
    store.autoSelectId = timerId;

    await setFlag("autoSelect", false);
    const spy = vi.spyOn(global, "clearTimeout");
    cleanupTimers(store);

    expect(spy).toHaveBeenCalledWith(timerId);
    expect(store.autoSelectId).toBeNull();
    spy.mockRestore();
  });

  it("uses the injected scheduler to clear stat selection timers", async () => {
    const handles = [];
    const fakeScheduler = {
      setTimeout: vi.fn((callback, delay) => {
        const handle = { callback, delay, id: handles.length + 1 };
        handles.push(handle);
        return handle;
      }),
      clearTimeout: vi.fn()
    };

    const globalClear = vi.spyOn(global, "clearTimeout");

    const schedulerModule = await import("../../src/helpers/scheduler.js");
    const getSchedulerSpy = vi
      .spyOn(schedulerModule, "getScheduler")
      .mockReturnValue(fakeScheduler);

    try {
      const { handleStatSelectionTimeout } = await import(
        "../../src/helpers/classicBattle/autoSelectHandlers.js"
      );

      const statHandle = fakeScheduler.setTimeout(() => {}, 2500);
      store.statTimeoutId = statHandle;

      handleStatSelectionTimeout(store, () => {}, 1000);
      const autoSelectHandle = store.autoSelectId;

      cleanupTimers(store);

      expect(fakeScheduler.clearTimeout).toHaveBeenCalledWith(statHandle);
      expect(fakeScheduler.clearTimeout).toHaveBeenCalledWith(autoSelectHandle);
      expect(globalClear).not.toHaveBeenCalled();
      expect(store.statTimeoutId).toBeNull();
      expect(store.autoSelectId).toBeNull();
      expect(store.selectionTimeoutScheduler).toBeNull();
      expect(store.statTimeoutScheduler).toBeNull();
      expect(store.autoSelectScheduler).toBeNull();
    } finally {
      getSchedulerSpy.mockRestore();
      globalClear.mockRestore();
    }
  });

  it("should not call resolveRoundDirect when orchestrator handles the event", async () => {
    const { resolveRound } = await import("../../src/helpers/classicBattle/roundResolver.js");
    dispatchBattleEvent.mockResolvedValue(true); // Simulate orchestrator handling it

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchBattleEvent).toHaveBeenCalledWith("statSelected");
    expect(resolveRound).not.toHaveBeenCalled();
  });

  it("should call resolveRoundDirect when orchestrator does not handle the event", async () => {
    const { resolveRound } = await import("../../src/helpers/classicBattle/roundResolver.js");
    dispatchBattleEvent.mockResolvedValue(false); // Simulate orchestrator not handling it

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchBattleEvent).toHaveBeenCalledWith("statSelected");
    expect(resolveRound).toHaveBeenCalled();
  });

  it("passes zero delay to resolveRoundDirect during orchestrator fallback", async () => {
    document.body.dataset.battleState = "active";
    store.orchestrator = {};
    getBattleState.mockReturnValue("roundDecision");
    dispatchBattleEvent.mockResolvedValue(false);

    // Create a deferred promise that resolves when roundResolved is emitted
    let resolveRoundResolved;
    const roundResolvedPromise = new Promise((resolve) => {
      resolveRoundResolved = resolve;
    });

    // Mock getRoundResolvedPromise to return our controlled promise
    const promises = await import("../../src/helpers/classicBattle/promises.js");
    promises.getRoundResolvedPromise.mockReturnValue(roundResolvedPromise);

    // Make emitBattleEvent resolve the promise when roundResolved is emitted
    const originalEmit = emitBattleEvent.getMockImplementation();
    emitBattleEvent.mockImplementation((eventName, ...args) => {
      if (eventName === "roundResolved") {
        resolveRoundResolved();
      }
      return originalEmit ? originalEmit(eventName, ...args) : undefined;
    });

    const timerUtils = await import("../../src/helpers/classicBattle/timerUtils.js");
    const resolver = await import("../../src/helpers/classicBattle/roundResolver.js");

    const handlePromise = handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await vi.runAllTimersAsync();
    await handlePromise;

    expect(resolver.resolveRound).toHaveBeenCalledWith(
      store,
      "power",
      1,
      2,
      expect.objectContaining({ delayMs: 0 })
    );
    expect(timerUtils.resolveDelay).toHaveBeenCalledTimes(1);

    delete document.body.dataset.battleState;
    getBattleState.mockReturnValue(null);
  });
});

describe("isOrchestratorActive", () => {
  let getBattleState;
  let isOrchestratorActive;

  beforeEach(async () => {
    ({ getBattleState } = await import("../../src/helpers/classicBattle/eventBus.js"));
    const selectionHandlerModule = await import(
      "../../src/helpers/classicBattle/selectionHandler.js"
    );
    isOrchestratorActive = selectionHandlerModule.isOrchestratorActive;
    getBattleState.mockReturnValue(null);
    delete document.body.dataset.battleState;
  });

  afterEach(() => {
    delete document.body.dataset.battleState;
  });

  it("returns false when orchestrator details are missing", () => {
    expect(isOrchestratorActive({})).toBe(false);
  });

  it("detects orchestrator when machine state is available", () => {
    getBattleState.mockReturnValue("roundDecision");
    expect(isOrchestratorActive({ orchestrator: {} })).toBe(true);
  });

  it("detects orchestrator using DOM dataset markers", () => {
    document.body.dataset.battleState = "roundDecision";
    expect(isOrchestratorActive({ orchestrator: {} })).toBe(true);
  });
});
