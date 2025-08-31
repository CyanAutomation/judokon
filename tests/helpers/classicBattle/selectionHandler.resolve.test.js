import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  STATS: ["power"],
  stopTimer: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn()
}));

import { handleStatSelection } from "../../../src/helpers/classicBattle.js";

describe("handleStatSelection resolution paths", () => {
  let store;
  let dispatchMock;
  let resolveMock;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.spyOn(global, "setTimeout");
    const { onBattleEvent, __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const { domStateListener } = await import(
      "../../../src/helpers/classicBattle/stateTransitionListeners.js"
    );
    __resetBattleEventTarget();
    onBattleEvent("battleStateChange", domStateListener);
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };
    dispatchMock = (await import("../../../src/helpers/classicBattle/eventDispatcher.js"))
      .dispatchBattleEvent;
    resolveMock = (await import("../../../src/helpers/classicBattle/roundResolver.js"))
      .resolveRound;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete document.body.dataset.battleState;
  });

  it("uses state machine when available", async () => {
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { from: null, to: "roundDecision", event: null });
    dispatchMock.mockResolvedValue();

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchMock).toHaveBeenCalledWith("statSelected");
    expect(resolveMock).not.toHaveBeenCalled();
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 600);
    expect(store.playerChoice).toBe("power");
  });

  it("resolves directly without machine", async () => {
    resolveMock.mockImplementation(async (s) => {
      s.playerChoice = null;
      return "direct";
    });

    const result = await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(resolveMock).toHaveBeenCalled();
    expect(result).toBe("direct");
    expect(store.playerChoice).toBeNull();
  });

  it("falls back to direct resolution on dispatch error", async () => {
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { from: null, to: "roundDecision", event: null });
    dispatchMock.mockRejectedValue(new Error("fail"));
    resolveMock.mockImplementation(async (s) => {
      s.playerChoice = null;
      return "fallback";
    });

    const result = await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchMock).toHaveBeenCalled();
    expect(resolveMock).toHaveBeenCalled();
    expect(result).toBe("fallback");
    expect(store.playerChoice).toBeNull();
  });
});
