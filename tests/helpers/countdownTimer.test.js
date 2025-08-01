import { describe, it, expect, vi } from "vitest";
import { createCountdownTimer } from "../../src/helpers/timerUtils.js";

describe("createCountdownTimer", () => {
  it("counts down and calls expired", () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onTick, onExpired });
    timer.start();
    expect(onTick).toHaveBeenCalledWith(2);
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(1000);
    expect(onExpired).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("pauses and resumes", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onExpired });
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(2000);
    expect(onExpired).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(1000);
    expect(onExpired).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("auto pauses when hidden", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onExpired, pauseOnHidden: true });
    timer.start();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true
    });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(2000);
    expect(onExpired).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false
    });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(2000);
    expect(onExpired).toHaveBeenCalled();
    delete document.hidden;
    vi.useRealTimers();
  });
});
