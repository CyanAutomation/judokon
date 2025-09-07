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

vi.mock("../../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn(() => "waitingForPlayerAction")
}));

import * as selection from "../../../src/helpers/classicBattle/selectionHandler.js";

const { handleStatSelection } = selection;

describe("handleStatSelection machine interaction", () => {
  let store;
  let dispatchMock;
  let resolveSpy;

  beforeEach(async () => {
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };
    dispatchMock = (await import("../../../src/helpers/classicBattle/orchestrator.js"))
      .dispatchBattleEvent;
    resolveSpy = vi.spyOn(selection, "resolveRoundDirect");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches statSelected once without resolving", async () => {
    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await Promise.resolve();
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith("statSelected");
  });
});
