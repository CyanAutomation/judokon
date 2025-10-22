import { afterEach, describe, expect, it, vi } from "vitest";
import { roundOverEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("classicBattle round reset", () => {
  afterEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it("clears player choice but preserves selection flags until next round", async () => {
    const store = { playerChoice: "power", selectionMade: true, __lastSelectionMade: true };
    const machine = { context: { store } };
    await roundOverEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(true);
    expect(store.__lastSelectionMade).toBe(true);
  });
});
