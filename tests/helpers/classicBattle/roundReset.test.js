import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roundOverEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { startRound, createBattleStore } from "../../../src/helpers/classicBattle/roundManager.js";
import * as cardSelection from "../../../src/helpers/classicBattle/cardSelection.js";

describe("classicBattle round reset", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("clears player choice but preserves selection flag for diagnostics", async () => {
    const store = { playerChoice: "power", selectionMade: true };
    const machine = { context: { store } };
    await roundOverEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(true);
  });

  it("resets selection flag when the next round starts", async () => {
    vi.spyOn(cardSelection, "drawCards").mockResolvedValue({
      playerJudoka: null,
      opponentJudoka: null
    });
    vi.spyOn(cardSelection, "_resetForTest").mockImplementation(() => {});

    const store = createBattleStore();
    store.selectionMade = true;
    store.playerChoice = "agility";

    await startRound(store);

    expect(store.selectionMade).toBe(false);
    expect(store.playerChoice).toBeNull();
  });
});
