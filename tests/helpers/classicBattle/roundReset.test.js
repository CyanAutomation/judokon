import { afterEach, describe, expect, it, vi } from "vitest";
import { roundOverEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { startRound, createBattleStore } from "../../../src/helpers/classicBattle/roundManager.js";
import * as cardSelection from "../../../src/helpers/classicBattle/cardSelection.js";

vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  drawCards: vi.fn(),
  _resetForTest: vi.fn()
}));

describe("classicBattle round reset", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("clears player choice but preserves selection flag for diagnostics", async () => {
    const store = { playerChoice: "power", selectionMade: true };
    const machine = { context: { store } };
    await roundOverEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(true);
  });

  it("resets selection flag when the next round starts", async () => {
    vi.mocked(cardSelection.drawCards).mockResolvedValue({
      playerJudoka: null,
      opponentJudoka: null
    });
    vi.mocked(cardSelection._resetForTest).mockImplementation(() => {});

    const store = createBattleStore();
    store.selectionMade = true;
    store.playerChoice = "agility";

    await startRound(store);

    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
  });
});
