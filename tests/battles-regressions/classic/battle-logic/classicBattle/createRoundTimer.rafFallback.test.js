import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { createRoundTimer } from "../../../src/helpers/timers/createRoundTimer.js";

describe("createRoundTimer fallback (no starter) under fake timers", () => {
  let timers;
  let timer;
  let tickSpy;
  let expiredSpy;

  beforeEach(() => {
    // Use Vitest fake timers to simulate environments where RAF/engine loop
    // is not driving timer ticks. The createRoundTimer fallback should still
    // expire using setInterval/setTimeout semantics.
    timers = useCanonicalTimers();
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
    timers.cleanup();
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

  it("clears the previous fallback timeout when restarting", () => {
    timer.start(3);
    vi.advanceTimersByTime(2000);

    timer.start(5);

    // After one additional second the old timer would have expired if not cleared
    vi.advanceTimersByTime(1000);

    expect(expiredSpy).not.toHaveBeenCalled();
    expect(tickSpy).toHaveBeenLastCalledWith(4);

    vi.advanceTimersByTime(4000);

    expect(expiredSpy).toHaveBeenCalledTimes(1);
  });

  it("stops the fallback timeout when stop is called", () => {
    timer.start(3);
    vi.advanceTimersByTime(1000);

    timer.stop();

    vi.advanceTimersByTime(5000);

    expect(expiredSpy).not.toHaveBeenCalled();
  });
});
