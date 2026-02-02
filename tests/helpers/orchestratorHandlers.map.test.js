import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupClassicBattleDom } from "../helpers/classicBattle/utils.js";

const ORCHESTRATOR_PATH = "../../src/helpers/classicBattle/orchestrator.js";
const BATTLE_EVENTS_PATH = "../../src/helpers/classicBattle/battleEvents.js";
const ROUND_DECISION_HELPERS_PATH =
  "../../src/helpers/classicBattle/stateHandlers/roundResolveHelpers.js";

function createStateTable() {
  return [
    {
      name: "waitingForMatchStart",
      type: "initial",
      triggers: [{ on: "startClicked", target: "roundSelect" }]
    },
    {
      name: "roundSelect",
      triggers: [
        { on: "statSelected", target: "roundResolve" },
        { on: "interrupt", target: "waitingForMatchStart" }
      ]
    },
    {
      name: "roundResolve",
      triggers: [{ on: "interrupt", target: "waitingForMatchStart" }]
    }
  ];
}

async function initMachine({
  store = { selectionMade: false, roundsPlayed: 0, roundReadyForInput: true }
} = {}) {
  const stateTable = createStateTable();
  const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(ORCHESTRATOR_PATH);
  await initClassicBattleOrchestrator({ store, stateTable });
  return { machine: getBattleStateMachine(), store };
}

async function registerEventSpies(...eventNames) {
  const events = await import(BATTLE_EVENTS_PATH);
  events.__resetBattleEventTarget();
  const subscriptions = [];
  const spies = new Map();
  for (const name of eventNames) {
    const spy = vi.fn();
    const handler = (event) => spy(event?.detail);
    events.onBattleEvent(name, handler);
    subscriptions.push([name, handler]);
    spies.set(name, spy);
  }
  return {
    spies,
    cleanup: () => {
      for (const [name, handler] of subscriptions) {
        events.offBattleEvent(name, handler);
      }
    }
  };
}

describe("stateHandlers map", () => {
  let domEnv;

  beforeEach(() => {
    domEnv = setupClassicBattleDom();
  });

  afterEach(() => {
    domEnv?.timerSpy?.clearAllTimers?.();
    domEnv?.restoreRAF?.();
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("exposes the handlers defined in the stateHandlers table", async () => {
    const { stateHandlers, getOnEnterHandler, getOnExitHandler } = await import(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );

    Object.entries(stateHandlers).forEach(([state, handlers]) => {
      if (handlers.onEnter) {
        expect(getOnEnterHandler(state)).toBe(handlers.onEnter);
      } else {
        expect(getOnEnterHandler(state)).toBeUndefined();
      }
      if (handlers.onExit) {
        expect(getOnExitHandler(state)).toBe(handlers.onExit);
      } else {
        expect(getOnExitHandler(state)).toBeUndefined();
      }
    });
  });

  it("enables player interaction when roundSelect is entered", async () => {
    const { spies, cleanup } = await registerEventSpies("statButtons:enable", "battleStateChange");
    const timerModule = await import("../../src/helpers/classicBattle/timerService.js");
    vi.spyOn(timerModule, "startTimer").mockResolvedValue(undefined);
    const selectionModule = await import("../../src/helpers/classicBattle/selectionHandler.js");
    vi.spyOn(selectionModule, "handleStatSelection").mockResolvedValue(undefined);

    const { machine } = await initMachine();

    try {
      expect(machine.getState()).toBe("waitingForMatchStart");
      await machine.dispatch("startClicked");

      const enableSpy = spies.get("statButtons:enable");
      const transitionSpy = spies.get("battleStateChange");

      expect(machine.getState()).toBe("roundSelect");
      expect(enableSpy).toHaveBeenCalledTimes(1);
      expect(transitionSpy.mock.calls.map(([detail]) => detail)).toContainEqual(
        expect.objectContaining({ to: "roundSelect", from: "waitingForMatchStart" })
      );
    } finally {
      cleanup();
    }
  });

  it("handles round decision timeout by interrupting the match", async () => {
    const { spies, cleanup } = await registerEventSpies(
      "battleStateChange",
      "scoreboardShowMessage",
      "debugPanelUpdate"
    );
    const helpers = await import(ROUND_DECISION_HELPERS_PATH);
    const cancelSelectionSpy = vi.fn();
    vi.spyOn(helpers, "recordEntry").mockImplementation(() => {});
    vi.spyOn(helpers, "resolveSelectionIfPresent").mockResolvedValue(false);
    vi.spyOn(helpers, "awaitPlayerChoice").mockRejectedValue(new Error("timeout"));
    vi.spyOn(helpers, "guardSelectionResolution").mockImplementation(() => cancelSelectionSpy);
    vi.spyOn(helpers, "schedulePostResolveWatchdog").mockImplementation(() => {});

    const timerModule = await import("../../src/helpers/classicBattle/timerService.js");
    vi.spyOn(timerModule, "startTimer").mockResolvedValue(undefined);
    const selectionModule = await import("../../src/helpers/classicBattle/selectionHandler.js");
    vi.spyOn(selectionModule, "handleStatSelection").mockResolvedValue(undefined);

    const { machine, store } = await initMachine();

    try {
      await machine.dispatch("startClicked");
      const result = await machine.dispatch("statSelected");

      const transitionSpy = spies.get("battleStateChange");

      expect(result).toBe(true);
      expect(cancelSelectionSpy).toHaveBeenCalled();
      expect(helpers.resolveSelectionIfPresent).toHaveBeenCalledWith(store);
      expect(helpers.awaitPlayerChoice).toHaveBeenCalledWith(store);
      expect(spies.get("scoreboardShowMessage")).toHaveBeenCalledWith(
        "No selection detected. Interrupting round."
      );
      expect(spies.get("debugPanelUpdate")).toHaveBeenCalled();
      const transitionDetails = transitionSpy.mock.calls.map(([detail]) => detail);
      expect(transitionDetails).toContainEqual(
        expect.objectContaining({ to: "roundResolve", from: "roundSelect" })
      );
      expect(transitionDetails).toContainEqual(
        expect.objectContaining({ to: "waitingForMatchStart", from: "roundResolve" })
      );
      expect(machine.getState()).toBe("waitingForMatchStart");
    } finally {
      cleanup();
    }
  });

  it("returns undefined for unknown state", async () => {
    const { getOnEnterHandler, getOnExitHandler } = await import(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    expect(getOnEnterHandler("missing")).toBeUndefined();
    expect(getOnExitHandler("missing")).toBeUndefined();
  });
});
