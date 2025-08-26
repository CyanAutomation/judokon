import { describe, it, expect } from "vitest";
import { roundOverEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("classicBattle round reset", () => {
  it("clears player choice and selection flag", async () => {
    const store = { playerChoice: "power", selectionMade: true };
    const machine = { context: { store } };
    await roundOverEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(false);
  });
});
