// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createCountdownTimer } from "../../src/helpers/timerUtils.js";

/**
 * These tests cover the small countdown timer utility used by the battle engine
 * and various pages. They focus on verifying the tick callback, pause/resume
 * logic and final expiration behaviour.
 */

describe("createCountdownTimer", () => {
  it("updates remaining time on each tick", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const timer = createCountdownTimer(3, { onTick });
    timer.start();
    expect(onTick).toHaveBeenCalledWith(3);
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(2);
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });

  it("handles pause and resume", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onExpired });
    timer.start();
    timer.pause();
    vi.advanceTimersByTime(2000);
    expect(onExpired).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(2000);
    expect(onExpired).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls expiration callback", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(1, { onExpired });
    timer.start();
    vi.advanceTimersByTime(1000);
    expect(onExpired).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it.each([0, -1])("expires immediately for non-positive duration %i", (dur) => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(dur, { onTick, onExpired });
    timer.start();
    expect(onTick).toHaveBeenCalledOnce();
    expect(onTick).toHaveBeenCalledWith(0);
    expect(onExpired).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
