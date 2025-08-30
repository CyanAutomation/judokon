import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
  STATS: ["power"],
  stopTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn(() => "waitingForPlayerAction")
}));

vi.mock("../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn(() => 1)
}));

vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/i18n.js", () => ({
  t: vi.fn((k) => k)
}));

import { handleStatSelection } from "../../src/helpers/classicBattle.js";

describe("handleStatSelection helpers", () => {
  let store;
  let stopTimer;
  let emitBattleEvent;
  let showSnackbar;

  beforeEach(async () => {
    store = { selectionMade: false, playerChoice: null, statTimeoutId: null, autoSelectId: null };
    ({ stopTimer } = await import("../../src/helpers/battleEngineFacade.js"));
    ({ emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js"));
    ({ showSnackbar } = await import("../../src/helpers/showSnackbar.js"));
  });

  it("ignores repeated selections", async () => {
    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });
    await handleStatSelection(store, "speed", { playerVal: 3, opponentVal: 4 });

    expect(stopTimer).toHaveBeenCalledTimes(1);
    expect(emitBattleEvent).toHaveBeenCalledTimes(1);
    expect(store.selectionMade).toBe(true);
  });

  it("applies test-mode shortcuts", async () => {
    document.body.innerHTML = `
      <div id="next-round-timer">123</div>
      <div id="round-message">hi</div>
    `;

    await handleStatSelection(store, "power", { playerVal: 1, opponentVal: 2 });

    expect(document.getElementById("next-round-timer").textContent).toBe("");
    expect(document.getElementById("round-message").textContent).toBe("");
    expect(showSnackbar).toHaveBeenCalledWith("ui.opponentChoosing");
  });
});
