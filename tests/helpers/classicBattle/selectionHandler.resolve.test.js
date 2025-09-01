import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  STATS: ["power"],
  stopTimer: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn()
}));

import { handleStatSelection } from "../../../src/helpers/classicBattle.js";

describe("handleStatSelection resolution", () => {
  let store;
  let dispatchMock;
  let resolveMock;

  beforeEach(async () => {
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };
    dispatchMock = (await import("../../../src/helpers/classicBattle/orchestrator.js"))
      .dispatchBattleEvent;
    resolveMock = (await import("../../../src/helpers/classicBattle/roundResolver.js"))
      .resolveRound;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves round and dispatches roundResolved", async () => {
    resolveMock.mockImplementation(async (s) => {
      s.playerChoice = null;
      return "direct";
    });
    const result = await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    expect(resolveMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith("roundResolved");
    expect(result).toBe("direct");
    expect(store.playerChoice).toBeNull();
  });

  it("still resolves when dispatch throws", async () => {
    dispatchMock.mockRejectedValue(new Error("fail"));
    resolveMock.mockImplementation(async (s) => {
      s.playerChoice = null;
      return "direct";
    });
    const result = await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    expect(resolveMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith("roundResolved");
    expect(result).toBe("direct");
    expect(store.playerChoice).toBeNull();
  });

  it("skips direct resolution when machine handles round", async () => {
    dispatchMock.mockImplementation(async (event) => {
      if (event === "statSelected") {
        store.playerChoice = null;
      }
    });
    const result = await handleStatSelection(store, "power", {
      playerVal: 1,
      opponentVal: 2
    });
    expect(resolveMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalledWith("roundResolved");
    expect(result).toBeUndefined();
    expect(store.playerChoice).toBeNull();
  });
});
