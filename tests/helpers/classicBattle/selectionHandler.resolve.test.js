import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// CRITICAL: Reset modules BEFORE mocking to ensure clean state
// This ensures vi.mock() declarations apply to all subsequent imports
vi.resetModules();

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  STATS: ["power"],
  stopTimer: vi.fn(),
  getScores: vi.fn()
}));

vi.mock("../../../src/helpers/api/battleUI.js", () => ({
  chooseOpponentStat: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
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

vi.mock("../../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/promises.js", () => ({
  getRoundResolvedPromise: vi.fn()
}));

vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

// Import AFTER mocking all dependencies
let handleStatSelection;

describe("handleStatSelection resolution", () => {
  let store;
  let dispatchMock;
  let resolveMock;
  let getBattleState;

  beforeEach(async () => {
    // Import handleStatSelection in beforeEach to ensure mocks are applied
    if (!handleStatSelection) {
      const module = await import("../../../src/helpers/classicBattle.js");
      handleStatSelection = module.handleStatSelection;
    }
    
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };
    dispatchMock = (await import("../../../src/helpers/classicBattle/eventDispatcher.js"))
      .dispatchBattleEvent;
    resolveMock = (await import("../../../src/helpers/classicBattle/roundResolver.js"))
      .resolveRound;
    getBattleState = (await import("../../../src/helpers/classicBattle/eventBus.js"))
      .getBattleState;
    getBattleState.mockReturnValue(null);
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
    getBattleState.mockReturnValue("roundDecision");
    const result = await handleStatSelection(store, "power", {
      playerVal: 1,
      opponentVal: 2
    });
    expect(resolveMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalledWith("roundResolved");
    expect(result).toBeUndefined();
    expect(store.playerChoice).toBeNull();
  });

  it("skips direct resolution when machine clears playerChoice but state unknown", async () => {
    dispatchMock.mockImplementation(async (event) => {
      if (event === "statSelected") {
        store.playerChoice = null;
      }
    });
    getBattleState.mockReturnValue(null);
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
