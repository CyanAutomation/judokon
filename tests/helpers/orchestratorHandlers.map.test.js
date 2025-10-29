import { beforeEach, describe, expect, it, vi } from "vitest";

describe("stateHandlers map", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <main>
        <div data-role="player-card"></div>
        <div data-role="opponent-card"></div>
      </main>
    `;
  });

  it("drives the orchestrator through player action and round decision states", async () => {
    const cancelSelectionSpy = vi.fn();
    const resolveSelectionMock = vi.fn(async () => {
      throw new Error("timeout");
    });
    const guardSelectionResolutionMock = vi.fn(() => cancelSelectionSpy);

    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearMessage: vi.fn(),
      showMessage: vi.fn(),
      updateTimer: vi.fn(),
      clearTimer: vi.fn(),
      updateRoundCounter: vi.fn(),
      clearRoundCounter: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/isStateTransition.js", () => ({
      isStateTransition: () => false,
      default: () => false
    }));
    vi.doMock("../../src/helpers/classicBattle/debugLogger.js", () => ({
      logStateTransition: vi.fn(),
      logEventEmit: vi.fn(),
      logTimerOperation: vi.fn(),
      logError: vi.fn(),
      logPerformance: vi.fn(),
      logStateHandlerEnter: vi.fn(),
      logStateHandlerExit: vi.fn(),
      logUIInteraction: vi.fn(),
      logBattleError: vi.fn(),
      createComponentLogger: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        event: vi.fn()
      })
    }));
    vi.doMock("../../src/helpers/classicBattle/timerService.js", () => ({
      startTimer: vi.fn(() => Promise.resolve())
    }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn(() => Promise.resolve())
    }));
    vi.doMock("../../src/helpers/classicBattle/cardStatUtils.js", () => ({
      getCardStatValue: vi.fn(() => 10)
    }));
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { speed: 9 } }))
    }));
    vi.doMock("../../src/helpers/classicBattle/guard.js", () => ({
      guard: (fn) => {
        try {
          return fn();
        } catch {
          return undefined;
        }
      },
      guardAsync: async (fn) => fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/handleRoundError.js", () => ({
      handleRoundError: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/stateHandlers/roundDecisionHelpers.js", () => ({
      recordEntry: vi.fn(),
      resolveSelectionIfPresent: resolveSelectionMock,
      awaitPlayerChoice: vi.fn(),
      guardSelectionResolution: guardSelectionResolutionMock,
      schedulePostResolveWatchdog: vi.fn()
    }));

    const roundDecisionModule = await import(
      "../../src/helpers/classicBattle/stateHandlers/roundDecisionEnter.js"
    );
    const roundDecisionEnterSpy = vi.spyOn(roundDecisionModule, "roundDecisionEnter");

    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const enableSpy = vi.fn();
    const messageSpy = vi.fn();
    const debugSpy = vi.fn();
    const transitions = [];
    const enableHandler = (event) => enableSpy(event.detail);
    const messageHandler = (event) => messageSpy(event.detail);
    const transitionHandler = (event) => transitions.push(event.detail);
    events.onBattleEvent("statButtons:enable", enableHandler);
    events.onBattleEvent("scoreboardShowMessage", messageHandler);
    events.onBattleEvent("debugPanelUpdate", debugSpy);
    events.onBattleEvent("battleStateChange", transitionHandler);

    // Sanity check that event wiring is active before running the scenario.
    events.emitBattleEvent("scoreboardShowMessage", "sanity-check");
    expect(messageSpy).toHaveBeenCalledWith("sanity-check");
    messageSpy.mockReset();

    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../src/helpers/classicBattle/orchestrator.js"
    );

    const stateTable = [
      {
        name: "waitingForMatchStart",
        type: "initial",
        triggers: [{ on: "startClicked", target: "waitingForPlayerAction" }]
      },
      {
        name: "waitingForPlayerAction",
        triggers: [
          { on: "statSelected", target: "roundDecision" },
          { on: "interrupt", target: "waitingForMatchStart" }
        ]
      },
      {
        name: "roundDecision",
        triggers: [{ on: "interrupt", target: "waitingForMatchStart" }]
      }
    ];

    const store = { selectionMade: false, roundsPlayed: 0 };
    await initClassicBattleOrchestrator({ store, stateTable });
    const machine = getBattleStateMachine();

    expect(machine?.getState()).toBe("waitingForMatchStart");
    expect(machine?.context?.store).toBe(store);

    await machine.dispatch("startClicked");
    expect(machine.getState()).toBe("waitingForPlayerAction");
    expect(enableSpy).toHaveBeenCalledTimes(1);

    const transitionResult = await machine.dispatch("statSelected");

    expect(transitionResult).toBe(true);

    expect(transitions.some((detail) => detail?.to === "roundDecision")).toBe(true);
    expect(roundDecisionEnterSpy).toHaveBeenCalled();
    expect(guardSelectionResolutionMock).toHaveBeenCalled();
    expect(resolveSelectionMock).toHaveBeenCalled();
    expect(cancelSelectionSpy).toHaveBeenCalled();
    expect(messageSpy).toHaveBeenCalledWith("No selection detected. Interrupting round.");
    expect(debugSpy).toHaveBeenCalled();
    expect(machine.getState()).toBe("waitingForMatchStart");

    roundDecisionEnterSpy.mockRestore();
    events.offBattleEvent("statButtons:enable", enableHandler);
    events.offBattleEvent("scoreboardShowMessage", messageHandler);
    events.offBattleEvent("debugPanelUpdate", debugSpy);
    events.offBattleEvent("battleStateChange", transitionHandler);
  });

  it("returns undefined for unknown state", () => {
    return import("../../src/helpers/classicBattle/orchestratorHandlers.js").then(
      ({ getOnEnterHandler, getOnExitHandler }) => {
        expect(getOnEnterHandler("missing")).toBeUndefined();
        expect(getOnExitHandler("missing")).toBeUndefined();
      }
    );
  });
});
