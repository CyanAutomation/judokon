import { describe, it, expect, beforeEach, vi } from "vitest";
import { roundStore } from "../../src/helpers/classicBattle/roundStore.js";

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

describe("RoundStore.reset()", () => {
  beforeEach(() => {
    roundStore.reset();
  });

  it("resets roundNumber to 1 and clears per-round state", () => {
    roundStore.setRoundNumber(5);
    roundStore.setRoundState("roundStart");
    roundStore.setSelectedStat("speed", { emitLegacyEvent: false });
    roundStore.setRoundOutcome("win");
    roundStore.markReadyDispatched();

    roundStore.reset();

    const state = roundStore.getStateSnapshot();
    expect(state.currentRound.number).toBe(1);
    expect(state.currentRound.state).toBe("waitingForMatchStart");
    expect(state.currentRound.selectedStat).toBeUndefined();
    expect(state.currentRound.outcome).toBeUndefined();
    expect(state.currentRound.startTime).toBeUndefined();
    expect(state.readyDispatched).toBe(false);
    expect(Array.isArray(state.transitionLog)).toBe(true);
    expect(state.transitionLog.length).toBe(0);
  });
});
