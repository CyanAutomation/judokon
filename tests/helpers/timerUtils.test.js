// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

beforeEach(() => {
  vi.resetModules();
});

describe("timerUtils", () => {
  it("returns the default timer for a category", async () => {
    vi.doMock("../../src/data/gameTimers.js", () => ({
      default: [
        { id: 1, value: 10, default: false, category: "roundTimer" },
        { id: 2, value: 20, default: true, category: "roundTimer" }
      ]
    }));
    const { getDefaultTimer } = await import("../../src/helpers/timerUtils.js");
    const val1 = await getDefaultTimer("roundTimer");
    const val2 = await getDefaultTimer("roundTimer");
    expect(val1).toBe(20);
    expect(val2).toBe(20);
  });

  it("delays fallback expiration for fractional durations", async () => {
    useCanonicalTimers();
    const { createCountdownTimer } = await import("../../src/helpers/timerUtils.js");

    const onTick = vi.fn();
    const onExpired = vi.fn();
    const cancel = vi.fn();
    let fallbackDelay = 0;
    let fallbackCallback;
    const scheduler = {
      setTimeout: vi.fn((cb, delay) => {
        fallbackCallback = cb;
        fallbackDelay = delay;
        return "fallback";
      }),
      clearTimeout: vi.fn()
    };

    const timer = createCountdownTimer(0.5, {
      onTick,
      onExpired,
      onSecondTick: () => 99,
      cancel,
      scheduler
    });

    timer.start();

    expect(onTick).toHaveBeenCalledWith(0.5);
    expect(fallbackDelay).toBe(500);
    expect(typeof fallbackCallback).toBe("function");
    expect(onExpired).not.toHaveBeenCalled();

    await fallbackCallback();

    expect(onTick).toHaveBeenLastCalledWith(0);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(99);

    timer.stop();
    vi.useRealTimers();
  });

  it("does not expire while paused until resumed", async () => {
    const timers = useCanonicalTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval").mockImplementation(() => 1);
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {});

    try {
      const { createCountdownTimer } = await import("../../src/helpers/timerUtils.js");

      const onExpired = vi.fn();
      const onTick = vi.fn();
      const cancel = vi.fn();

      let nextSchedulerId = 1;
      const pendingTimeouts = new Map();
      const scheduler = {
        setTimeout: vi.fn((cb, delay) => {
          const timeoutHandle = setTimeout(cb, delay);
          const id = nextSchedulerId++;
          pendingTimeouts.set(id, timeoutHandle);
          return id;
        }),
        clearTimeout: vi.fn((id) => {
          if (pendingTimeouts.has(id)) {
            const handle = pendingTimeouts.get(id);
            pendingTimeouts.delete(id);
            clearTimeout(handle);
          } else {
            clearTimeout(id);
          }
        })
      };

      const timer = createCountdownTimer(1.5, {
        onTick,
        onExpired,
        onSecondTick: () => "sub",
        cancel,
        scheduler
      });

      timer.start();

      await timers.advanceTimersByTimeAsync(400);
      timer.pause();

      expect(onExpired).not.toHaveBeenCalled();
      expect(scheduler.clearTimeout).toHaveBeenCalled();

      await timers.advanceTimersByTimeAsync(6000);
      expect(onExpired).not.toHaveBeenCalled();

      timer.resume();

      await timers.advanceTimersByTimeAsync(1099);
      expect(onExpired).not.toHaveBeenCalled();

      await timers.advanceTimersByTimeAsync(1);
      expect(onExpired).toHaveBeenCalledTimes(1);
    } finally {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
      timers.cleanup();
    }
  });
});
