import { describe, it, expect, vi, afterEach } from "vitest";
import { createCountdownTimer } from "../../../src/helpers/timerUtils.js";

describe("createCountdownTimer fallback", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.__hardTimeoutScheduled;
  });

  it("expires under fake timers when scheduler has no raf", async () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(1, {
      onTick: () => {},
      onExpired,
      scheduler: { setTimeout, clearTimeout }
    });
    timer.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onExpired).toHaveBeenCalled();
    expect(globalThis.__hardTimeoutScheduled).toBeGreaterThan(0);
  });
});
