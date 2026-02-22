import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";
import { handleTimerExpiration } from "../../../src/helpers/classicBattle/timerService.js";
import { interruptRoundEnter } from "../../../src/helpers/classicBattle/stateHandlers/interruptRoundEnter.js";
import { EVENT_TYPES } from "../../../src/helpers/classicBattle/eventCatalog.js";

const {
  applyControlStateTransitionSpy,
  handleRoundStartedEventSpy,
  handleRoundResolvedEventSpy,
  showRoundOutcomeSpy,
  emitBattleEventSpy
} = vi.hoisted(() => ({
  applyControlStateTransitionSpy: vi.fn(),
  handleRoundStartedEventSpy: vi.fn(async () => {}),
  handleRoundResolvedEventSpy: vi.fn(async () => {}),
  showRoundOutcomeSpy: vi.fn(),
  emitBattleEventSpy: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/battleEvents.js");
  emitBattleEventSpy.mockImplementation((name, payload) => actual.emitBattleEvent(name, payload));
  return {
    ...actual,
    emitBattleEvent: emitBattleEventSpy
  };
});

vi.mock("../../../src/helpers/classicBattle/uiStateReducer.js", () => ({
  applyControlStateTransition: applyControlStateTransitionSpy
}));

vi.mock("../../../src/helpers/classicBattle/roundUI.js", () => ({
  handleRoundStartedEvent: handleRoundStartedEventSpy,
  handleRoundResolvedEvent: handleRoundResolvedEventSpy
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  showRoundOutcome: showRoundOutcomeSpy
}));

let timers;

/**
 * Create a state manager instance for testing with custom handlers and context.
 *
 * @pseudocode
 * 1. Import createStateManager from stateManager module
 * 2. Initialize with custom onEnter handlers, context, and transition callback
 * 3. Return configured state machine for test usage
 *
 * @param {Record<string, Function>} [onEnterMap={}] - Map of state name to onEnter handler functions
 * @param {object} [context={}] - Initial machine context (engine, store, etc.)
 * @param {Function} [onTransition] - Optional transition callback
 * @returns {Promise<object>} State manager instance with dispatch and getState methods
 */
async function createMachine(onEnterMap = {}, context = {}, onTransition = undefined) {
  const { createStateManager } = await import("../../../src/helpers/classicBattle/stateManager.js");
  return createStateManager(onEnterMap, context, onTransition, CLASSIC_BATTLE_STATES);
}

/**
 * Advance a state machine through the initial states to reach roundSelect.
 *
 * @pseudocode
 * 1. Dispatch "startClicked" to enter matchStart state
 * 2. Dispatch "ready" twice to transition through roundWait and roundPrompt
 * 3. Dispatch "cardsRevealed" to reach roundSelect state
 *
 * @param {object} machine - State manager instance with dispatch method
 * @returns {Promise<void>}
 */
async function advanceToRoundSelect(machine) {
  await machine.dispatch("startClicked");
  await machine.dispatch("ready");
  await machine.dispatch("ready");
  await machine.dispatch("cardsRevealed");
}

describe("classic battle event conformance audit", () => {
  beforeEach(() => {
    timers = useCanonicalTimers();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.__resetBattleEventTarget();
    timers.cleanup();
  });

  it("does not project UI mode transitions for round.started/round.evaluated", async () => {
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const { bindRoundFlowController } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );

    battleEvents.__resetBattleEventTarget();
    bindRoundFlowController();

    battleEvents.emitBattleEvent(EVENT_TYPES.STATE_ROUND_STARTED, { round: 1 });
    battleEvents.emitBattleEvent("round.evaluated", { outcome: "winPlayer" });
    await Promise.resolve();

    expect(handleRoundStartedEventSpy).toHaveBeenCalledTimes(1);
    expect(handleRoundResolvedEventSpy).toHaveBeenCalledTimes(1);
    expect(applyControlStateTransitionSpy).not.toHaveBeenCalled();

    battleEvents.emitBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, {
      from: "roundResolve",
      to: "roundDisplay"
    });

    expect(applyControlStateTransitionSpy).toHaveBeenCalledTimes(1);
  });

  it("treats statSelected as intent-only and transitions only after accepted lock", async () => {
    const transitions = [];
    const lockEngine = {
      requestSelectionLock: vi.fn(() => ({
        accepted: true,
        reason: "ok",
        roundKey: 1,
        statKey: "power",
        source: "player"
      }))
    };

    const machine = await createMachine(
      {},
      { engine: lockEngine, store: { roundsPlayed: 0 } },
      ({ to }) => transitions.push(to)
    );

    await advanceToRoundSelect(machine);
    const accepted = await machine.dispatch("statSelected", {
      stat: "power",
      opts: { selectionSource: "player", roundKey: 1 }
    });

    expect(accepted).toBe(true);
    expect(machine.getState()).toBe("roundResolve");
    expect(lockEngine.requestSelectionLock).toHaveBeenCalledTimes(1);
    expect(transitions.at(-1)).toBe("roundResolve");

    lockEngine.requestSelectionLock.mockReturnValueOnce({
      accepted: false,
      reason: "duplicate",
      source: "auto"
    });
    const rejected = await machine.dispatch("statSelected", {
      stat: "speed",
      opts: { selectionSource: "auto", roundKey: 1 }
    });
    expect(rejected).toBe(false);
    expect(machine.getState()).toBe("roundResolve");
  });

  it("emits input.ignored on duplicate lock attempts", async () => {
    const lockEngine = {
      requestSelectionLock: vi
        .fn()
        .mockReturnValueOnce({ accepted: true, reason: "ok", roundKey: 1, source: "player" })
        .mockReturnValueOnce({ accepted: false, reason: "duplicate", roundKey: 1, source: "auto" })
    };
    const machine = await createMachine({}, { engine: lockEngine, store: { roundsPlayed: 0 } });

    await advanceToRoundSelect(machine);
    await machine.dispatch("statSelected", { stat: "power", opts: { selectionSource: "player" } });
    const duplicate = await machine.dispatch("statSelected", {
      stat: "speed",
      opts: { selectionSource: "auto" }
    });

    expect(duplicate).toBe(false);
    expect(emitBattleEventSpy).toHaveBeenCalledWith(
      "input.ignored",
      expect.objectContaining({
        kind: "selectionLockRejected",
        reason: "duplicate",
        source: "auto"
      })
    );
  });

  it("does not let round.timer.expired override an already accepted manual lock", async () => {
    const emitted = [];
    const emitEvent = vi.fn((eventName) => emitted.push(eventName));
    const dispatchEvent = vi.fn();
    const autoSelect = vi.fn();
    const onExpiredSelect = vi.fn();

    const onExpired = handleTimerExpiration({
      duration: 30,
      onExpiredSelect,
      store: { selectionMade: true },
      emitEvent,
      dispatchEvent,
      autoSelect
    });

    await onExpired();

    expect(emitted).toContain("round.timer.expired");
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(autoSelect).not.toHaveBeenCalled();
    expect(onExpiredSelect).not.toHaveBeenCalled();
  });

  it("keeps resolve/evaluated/display ordering deterministic", async () => {
    const sequence = [];
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");

    const machine = await createMachine(
      {
        roundResolve: async (manager) => {
          sequence.push("roundResolve.enter");
          battleEvents.emitBattleEvent("round.evaluated", { outcome: "winPlayer" });
          await manager.dispatch("outcome=winPlayer");
        },
        roundDisplay: async () => {
          sequence.push("roundDisplay.enter");
          sequence.push("round.displayed");
        }
      },
      { store: { roundsPlayed: 0 }, engine: { requestSelectionLock: () => ({ accepted: true }) } },
      undefined
    );

    await advanceToRoundSelect(machine);
    await machine.dispatch("statSelected", { stat: "power", opts: { selectionSource: "player" } });

    const emittedNames = emitBattleEventSpy.mock.calls.map(([eventName]) => eventName);
    const evaluatedIndex = emittedNames.indexOf("round.evaluated");
    expect(evaluatedIndex).toBeGreaterThan(-1);
    expect(sequence).toEqual(["roundResolve.enter", "roundDisplay.enter", "round.displayed"]);
    expect(evaluatedIndex).toBeGreaterThan(emittedNames.lastIndexOf("round.selection.locked"));
  });

  it("emits interrupt.raised/interrupt.resolved taxonomy for pause-resume flow", async () => {
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");

    const machine = await createMachine(
      {
        interruptRound: async (manager, payload) => interruptRoundEnter(manager, payload)
      },
      {
        store: { roundsPlayed: 0, selectionMade: true },
        engine: { requestSelectionLock: () => ({ accepted: true }) }
      },
      ({ from, event }) => {
        if (from === "interruptRound" && event === "restartRound") {
          battleEvents.emitBattleEvent("interrupt.resolved", { outcome: "restartRound" });
        }
      }
    );

    await advanceToRoundSelect(machine);
    await machine.dispatch("interrupt", { reason: "timeout" });

    expect(machine.getState()).toBe("roundWait");
    expect(emitBattleEventSpy).toHaveBeenCalledWith(
      "interrupt.raised",
      expect.objectContaining({
        scope: "round",
        reason: "timeout",
        inputFrozen: true,
        resumeTarget: "roundWait"
      })
    );
    expect(emitBattleEventSpy).toHaveBeenCalledWith(
      "interrupt.resolved",
      expect.objectContaining({ outcome: "restartRound" })
    );
  });
});
