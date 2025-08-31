import { describe, it, expect, vi } from "vitest";
import { scheduleGuard } from "../../../src/helpers/classicBattle/guard.js";

describe("scheduleGuard", () => {
  it("invokes callback after timeout", async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const cancel = scheduleGuard(50, cb);
    vi.advanceTimersByTime(50);
    await vi.runAllTimersAsync();
    expect(cb).toHaveBeenCalledOnce();
    cancel();
    vi.useRealTimers();
  });

  it("cancels scheduled callback", async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const cancel = scheduleGuard(50, cb);
    cancel();
    vi.advanceTimersByTime(50);
    await vi.runAllTimersAsync();
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
