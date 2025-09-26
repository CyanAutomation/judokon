import { describe, it, expect, beforeEach } from "vitest";
import { roundStore } from "@/helpers/classicBattle/roundStore.js";

describe("roundStore.reset", () => {
  beforeEach(() => {
    // Start from a mutated state
    roundStore.setRoundNumber(5);
    roundStore.setRoundState("roundEnd");
    roundStore.setSelectedStat("power", { emitLegacyEvent: false });
    roundStore.setRoundOutcome("win");
    roundStore.markReadyDispatched();
  });

  it("resets to waiting state and round 1 with cleared fields", () => {
    roundStore.reset();
    const snap = roundStore.getStateSnapshot();

    expect(snap.currentRound.number).toBe(1);
    expect(snap.currentRound.state).toBe("waitingForMatchStart");
    expect(snap.currentRound.selectedStat).toBeUndefined();
    expect(snap.currentRound.outcome).toBeUndefined();
    expect(snap.currentRound.startTime).toBeUndefined();
    expect(snap.readyDispatched).toBe(false);
    expect(Array.isArray(snap.transitionLog)).toBe(true);
    expect(snap.transitionLog.length).toBe(0);
  });
});
