import { afterEach, describe, expect, it, vi } from "vitest";
import { roundDisplayEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";

describe("classicBattle round reset", () => {
  afterEach(() => {
    __resetBattleEventTarget();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("clears player choice but preserves selection flags until next round", async () => {
    const store = { playerChoice: "power", selectionMade: true };
    const machine = { context: { store } };
    await roundDisplayEnter(machine);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionMade).toBe(true);
  });

  it("waits for outcome confirmation before resolving when configured", async () => {
    const store = { playerChoice: "speed", selectionMade: true };
    const machine = { context: { store, waitForOutcomeConfirmation: true } };

    const completionSpy = vi.fn();
    const promise = roundDisplayEnter(machine).then(completionSpy);

    // Immediate reset happens before awaiting confirmation.
    expect(store.playerChoice).toBeNull();

    // Allow microtasks to flush to ensure the promise remains pending.
    await Promise.resolve();
    expect(completionSpy).not.toHaveBeenCalled();

    emitBattleEvent("outcomeConfirmed");

    await promise;
    expect(store.selectionMade).toBe(true);
    expect(completionSpy).toHaveBeenCalledTimes(1);
  });
});
