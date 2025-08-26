import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn()
}));

import { resolveRoundViaMachine } from "../../../src/helpers/classicBattle/selectionHandler.js";
import { dispatchBattleEvent } from "../../../src/helpers/classicBattle/eventDispatcher.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { resolveRound } from "../../../src/helpers/classicBattle/roundResolver.js";

describe("resolveRoundViaMachine race", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("falls back after 600ms when dispatch delays", async () => {
    dispatchBattleEvent.mockImplementation(() => new Promise((r) => setTimeout(r, 1000)));
    resolveRound.mockImplementation(async (store) => {
      emitBattleEvent("roundResolved", { store });
      store.playerChoice = null;
    });
    const store = { playerChoice: "power" };
    const promise = resolveRoundViaMachine(store, "power", 1, 2);

    await vi.advanceTimersByTimeAsync(599);
    expect(store.playerChoice).toBe("power");

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(emitBattleEvent).toHaveBeenCalledWith("roundResolved", expect.any(Object));
    expect(store.playerChoice).toBeNull();

    await vi.advanceTimersByTimeAsync(400);
    await promise;
  });
});
