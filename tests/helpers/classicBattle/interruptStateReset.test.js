import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  emitBattleEvent,
  exposeDebugState,
  cancelRoundResolveGuard,
  debugLog,
  cleanupTimers,
  logSelectionMutation,
  pauseTimer,
  resumeTimer,
  getTimerState
} = vi.hoisted(() => ({
  emitBattleEvent: vi.fn(),
  exposeDebugState: vi.fn(),
  cancelRoundResolveGuard: vi.fn(),
  debugLog: vi.fn(),
  cleanupTimers: vi.fn(),
  logSelectionMutation: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  getTimerState: vi.fn(() => ({
    remaining: 9,
    paused: false,
    category: "roundTimer",
    pauseOnHidden: true
  }))
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent
}));

vi.mock("../../../src/helpers/classicBattle/debugHooks.js", () => ({
  exposeDebugState
}));

vi.mock("../../../src/helpers/classicBattle/stateHandlers/guardCancellation.js", () => ({
  cancelRoundResolveGuard
}));

vi.mock("../../../src/helpers/classicBattle/debugLog.js", () => ({
  debugLog
}));

vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  pauseTimer,
  resumeTimer,
  getTimerState
}));

vi.mock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
  cleanupTimers,
  logSelectionMutation
}));

import {
  resolveInterruptContext,
  freezeInterruptContext
} from "../../../src/helpers/classicBattle/stateHandlers/interruptStateCleanup.js";
import { interruptMatchEnter } from "../../../src/helpers/classicBattle/stateHandlers/interruptMatchEnter.js";
import { interruptRoundEnter } from "../../../src/helpers/classicBattle/stateHandlers/interruptRoundEnter.js";

function createMachine() {
  const store = {
    selectionMade: true,
    playerChoice: "speed",
    __lastSelectionMade: true,
    inputAccepted: true,
    interruptResumeContext: null
  };

  let dispatchSnapshot;
  const machine = {
    context: { store },
    dispatch: vi.fn(async (event, payload) => {
      dispatchSnapshot = {
        event,
        selectionMade: store.selectionMade,
        playerChoice: store.playerChoice,
        __lastSelectionMade: store.__lastSelectionMade,
        inputAccepted: store.inputAccepted,
        interruptResumeContext: store.interruptResumeContext,
        payload
      };
    })
  };

  return { store, machine, getDispatchSnapshot: () => dispatchSnapshot };
}

describe("classic battle interrupt selection cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets selection state, raises interrupt event, and freezes input before round restart", async () => {
    const { store, machine, getDispatchSnapshot } = createMachine();

    await interruptRoundEnter(machine, { reason: "timeout" });

    expect(cleanupTimers).toHaveBeenCalledWith(store, { preserveEngineTimer: true });
    expect(machine.dispatch).toHaveBeenCalledWith("restartRound", { reason: "timeout" });
    expect(pauseTimer).toHaveBeenCalledTimes(1);
    expect(emitBattleEvent).toHaveBeenCalledWith(
      "interrupt.raised",
      expect.objectContaining({
        scope: "round",
        reason: "timeout",
        resumeTarget: "roundWait",
        inputFrozen: true,
        remainingMs: 9000
      })
    );

    const snapshot = getDispatchSnapshot();
    expect(snapshot).toEqual(
      expect.objectContaining({
        event: "restartRound",
        selectionMade: false,
        playerChoice: null,
        __lastSelectionMade: false,
        inputAccepted: false,
        interruptResumeContext: expect.objectContaining({
          resumeTarget: "roundWait",
          inputFrozen: true,
          timerSnapshot: expect.objectContaining({ remaining: 9 })
        })
      })
    );
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
    expect(store.__lastSelectionMade).toBe(false);
  });

  it("clears selection flags and freezes match context before returning to lobby", async () => {
    const { store, machine, getDispatchSnapshot } = createMachine();
    const payload = { reason: "disconnect" };

    await interruptMatchEnter(machine, payload);

    expect(machine.dispatch).toHaveBeenCalledWith("toLobby", payload);
    expect(emitBattleEvent).toHaveBeenCalledWith(
      "interrupt.raised",
      expect.objectContaining({
        scope: "match",
        reason: "disconnect",
        resumeTarget: "waitingForMatchStart",
        inputFrozen: true,
        remainingMs: 9000
      })
    );

    const snapshot = getDispatchSnapshot();
    expect(snapshot).toEqual(
      expect.objectContaining({
        event: "toLobby",
        selectionMade: false,
        playerChoice: null,
        __lastSelectionMade: false,
        inputAccepted: false,
        payload,
        interruptResumeContext: expect.objectContaining({
          resumeTarget: "waitingForMatchStart"
        })
      })
    );
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
    expect(store.__lastSelectionMade).toBe(false);
  });

  it("restores timer only for resume outcomes and clears persisted resume context", () => {
    const store = {
      inputAccepted: false,
      interruptResumeContext: freezeInterruptContext({}, { reason: "timeout" }, "roundWait")
    };

    const resolution = resolveInterruptContext(store, "restartRound");

    expect(resumeTimer).toHaveBeenCalledTimes(1);
    expect(resolution).toEqual(
      expect.objectContaining({
        resumeTarget: "roundWait",
        restoredTimer: true,
        timerSnapshot: expect.objectContaining({ remaining: 9 })
      })
    );
    expect(store.inputAccepted).toBe(true);
    expect(store.interruptResumeContext).toBeNull();
  });
});
