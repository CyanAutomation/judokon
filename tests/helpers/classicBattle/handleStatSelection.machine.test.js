import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("handleStatSelection machine interaction", () => {
  let store;
  let dispatchMock;
  let dispatchCalls = [];
  let resolveSpy;
  let getBattleState;
  let handleStatSelection;
  let selection;

  beforeEach(async () => {
    // Reset modules to ensure fresh mocks for each test
    vi.resetModules();

    // Set up mocks before importing modules
    vi.mock("../../../src/helpers/BattleEngine.js", () => ({
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

    vi.mock("../../../src/helpers/classicBattle/eventBus.js", () => ({
      getBattleState: vi.fn(() => "roundDecision")
    }));

    // Import after mocks are set up
    selection = await import("../../../src/helpers/classicBattle/selectionHandler.js");
    handleStatSelection = selection.handleStatSelection;

    store = {
      selectionMade: false,
      playerChoice: null,
      statTimeoutId: null,
      autoSelectId: null,
      orchestrator: {}
    };
    dispatchMock = (await import("../../../src/helpers/classicBattle/eventDispatcher.js"))
      .dispatchBattleEvent;
    dispatchCalls = [];
    dispatchMock.mockImplementation(async (...args) => {
      dispatchCalls.push(args);
      if (args[0] === "statSelected") {
        return true;
      }
      return false;
    });
    resolveSpy = vi.spyOn(selection, "resolveRoundDirect");
    ({ getBattleState } = await import("../../../src/helpers/classicBattle/eventBus.js"));
    getBattleState.mockReturnValue("roundDecision");
    document.body.dataset.battleState = "roundDecision";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete document.body.dataset.battleState;
  });

  it("dispatches statSelected once without resolving", async () => {
    expect(dispatchCalls.length).toBe(0);
    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await Promise.resolve();
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(dispatchCalls.length).toBe(1);
    expect(dispatchCalls[0][0]).toBe("statSelected");
  });

  it("resolves directly when orchestrator context is missing", async () => {
    delete store.orchestrator;
    dispatchMock.mockImplementationOnce(async (...args) => {
      dispatchCalls.push(args);
      return false;
    });
    getBattleState.mockReturnValue("roundDecision");

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(dispatchCalls[0][0]).toBe("statSelected");
    expect(store.playerChoice).toBeNull();
  });
});
