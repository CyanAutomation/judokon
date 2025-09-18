import { describe, it, expect, vi, afterEach } from "vitest";
import { createCountdownTimer } from "../../../src/helpers/timerUtils.js";
import { TimerController } from "../../../src/helpers/TimerController.js";

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
      onExpired
    });
    timer.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onExpired).toHaveBeenCalled();
    expect(globalThis.__hardTimeoutScheduled).toBeGreaterThan(0);
  });

  it("expires via TimerController with injected scheduler", async () => {
    const timerSpy = vi.useFakeTimers();
    const controller = new TimerController();
    const onExpired = vi.fn();
    await controller.startCoolDown(
      () => {},
      async () => onExpired(),
      1
    );
    timerSpy.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    expect(onExpired).toHaveBeenCalled();
  });
});
