import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleRoundDecisionGuard } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("scheduleRoundDecisionGuard", () => {
  let timerSpy;
  let machine;
  let store;
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.__roundDebug = {};
    timerSpy = vi.useFakeTimers();
    store = { playerChoice: null };
    machine = { dispatch: vi.fn().mockResolvedValue(undefined) };
    return (async () => {
      const { onBattleEvent, emitBattleEvent, __resetBattleEventTarget } = await import(
        "../../../src/helpers/classicBattle/battleEvents.js"
      );
      const { domStateListener } = await import(
        "../../../src/helpers/classicBattle/stateTransitionListeners.js"
      );
      __resetBattleEventTarget();
      onBattleEvent("battleStateChange", domStateListener);
      emitBattleEvent("battleStateChange", { from: null, to: "roundDecision", event: null });
    })();
  });
  afterEach(() => {
    timerSpy.clearAllTimers();
    vi.restoreAllMocks();
  });
  it("interrupts when no selection occurs", async () => {
    scheduleRoundDecisionGuard(store, machine);
    timerSpy.advanceTimersByTime(1200);
    await vi.runAllTimersAsync();
    expect(machine.dispatch).toHaveBeenCalledWith("interrupt", { reason: "stalledNoSelection" });
  });
});
