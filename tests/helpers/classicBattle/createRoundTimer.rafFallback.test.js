import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoundTimer } from "../../../src/helpers/timers/createRoundTimer.js";

describe("createRoundTimer fallback (no starter) under fake timers", () => {
  let timer;
  let tickSpy;
  let expiredSpy;

  beforeEach(() => {
    // Use Vitest fake timers to simulate environments where RAF/engine loop
    // is not driving timer ticks. The createRoundTimer fallback should still
    // expire using setInterval/setTimeout semantics.
    vi.useFakeTimers();
    timer = createRoundTimer();
    tickSpy = vi.fn();
    expiredSpy = vi.fn();
    timer.on("tick", tickSpy);
    timer.on("expired", expiredSpy);
  });

  afterEach(() => {
    try {
      vi.runOnlyPendingTimers();
    } catch {}
    vi.useRealTimers();
  });

  it("emits tick and then expired when using fake timers", async () => {
    // Start a 1-second countdown
    timer.start(1);

    // Initial tick should be emitted synchronously on start
    expect(tickSpy).toHaveBeenCalled();

    // Advance fake timers by 1000ms to trigger expiration
    vi.advanceTimersByTime(1000);
    // Allow any pending timer callbacks to run
    await vi.runAllTimersAsync();

    expect(expiredSpy).toHaveBeenCalled();
  });
});
