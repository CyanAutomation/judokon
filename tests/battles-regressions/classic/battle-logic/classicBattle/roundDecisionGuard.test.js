import { describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { scheduleGuard } from "../../../src/helpers/classicBattle/guard.js";

describe("scheduleGuard", () => {
  it("invokes callback after timeout", async () => {
    const timers = useCanonicalTimers();
    const cb = vi.fn();
    const cancel = scheduleGuard(50, cb);
    vi.advanceTimersByTime(50);
    await vi.runAllTimersAsync();
    expect(cb).toHaveBeenCalledOnce();
    cancel();
    timers.cleanup();
  });

  it("cancels scheduled callback", async () => {
    const timers = useCanonicalTimers();
    const cb = vi.fn();
    const cancel = scheduleGuard(50, cb);
    cancel();
    vi.advanceTimersByTime(50);
    await vi.runAllTimersAsync();
    expect(cb).not.toHaveBeenCalled();
    timers.cleanup();
  });
});
