import { afterEach, describe, expect, it, vi } from "vitest";
import { roundOverEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("classicBattle round reset", () => {
  afterEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it("clears player choice and selection flag for next round", async () => {
    const store = { playerChoice: "power", selectionMade: true };
    const machine = { context: { store } };
    await roundOverEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(false);
  });
});
