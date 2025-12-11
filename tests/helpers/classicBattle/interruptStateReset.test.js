import { describe, it, expect, beforeEach, vi } from "vitest";

const { emitBattleEvent, exposeDebugState, cancelRoundDecisionGuard, debugLog } = vi.hoisted(
  () => ({
    emitBattleEvent: vi.fn(),
    exposeDebugState: vi.fn(),
    cancelRoundDecisionGuard: vi.fn(),
    debugLog: vi.fn()
  })
);

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent
}));

vi.mock("../../../src/helpers/classicBattle/debugHooks.js", () => ({
  exposeDebugState
}));

vi.mock("../../../src/helpers/classicBattle/stateHandlers/guardCancellation.js", () => ({
  cancelRoundDecisionGuard
}));

vi.mock("../../../src/helpers/classicBattle/debugLog.js", () => ({
  debugLog
}));

vi.mock("../../../src/helpers/classicBattle/stateHandlers/interruptStateCleanup.js", () => ({
  cleanupInterruptState: vi.fn()
}));

import { interruptMatchEnter } from "../../../src/helpers/classicBattle/stateHandlers/interruptMatchEnter.js";
import { interruptRoundEnter } from "../../../src/helpers/classicBattle/stateHandlers/interruptRoundEnter.js";

function createMachine() {
  const store = {
    selectionMade: true,
    playerChoice: "speed",
    __lastSelectionMade: true
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

  it("resets selection state before restarting the round", async () => {
    const { store, machine, getDispatchSnapshot } = createMachine();

    await interruptRoundEnter(machine, { reason: "timeout" });

    expect(machine.dispatch).toHaveBeenCalledWith("restartRound");
    const snapshot = getDispatchSnapshot();
    expect(snapshot).toEqual(
      expect.objectContaining({
        event: "restartRound",
        selectionMade: false,
        playerChoice: null,
        __lastSelectionMade: false
      })
    );
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
    expect(store.__lastSelectionMade).toBe(false);
  });

  it("clears selection flags before returning to the lobby", async () => {
    const { store, machine, getDispatchSnapshot } = createMachine();
    const payload = { reason: "disconnect" };

    await interruptMatchEnter(machine, payload);

    expect(machine.dispatch).toHaveBeenCalledWith("toLobby", payload);
    const snapshot = getDispatchSnapshot();
    expect(snapshot).toEqual(
      expect.objectContaining({
        event: "toLobby",
        selectionMade: false,
        playerChoice: null,
        __lastSelectionMade: false,
        payload
      })
    );
    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
    expect(store.__lastSelectionMade).toBe(false);
  });
});
