import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleRoundDecisionGuard } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("scheduleRoundDecisionGuard", () => {
  let timerSpy;
  let machine;
  let store;
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.dataset.battleState = "roundDecision";
    window.__roundDebug = {};
    timerSpy = vi.useFakeTimers();
    store = { playerChoice: null };
    machine = { dispatch: vi.fn().mockResolvedValue(undefined) };
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
