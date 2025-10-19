import { describe, it, expect, vi } from "vitest";
import { roundOverEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("classicBattle round reset", () => {
  it("clears player choice but preserves selection flag for diagnostics", async () => {
    const store = { playerChoice: "power", selectionMade: true };
    const machine = { context: { store } };
    await roundOverEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(true);
  });

  it("resets selection flag when the next round starts", async () => {
    vi.resetModules();
    vi.doMock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
      drawCards: vi.fn().mockResolvedValue({ playerJudoka: null, opponentJudoka: null }),
      _resetForTest: vi.fn()
    }));

    const { startRound, createBattleStore } = await import(
      "../../../src/helpers/classicBattle/roundManager.js"
    );

    const store = createBattleStore();
    store.selectionMade = true;
    store.playerChoice = "agility";

    await startRound(store);

    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();

    vi.resetModules();
  });
});
