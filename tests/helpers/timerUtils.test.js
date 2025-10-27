// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

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
    vi.useFakeTimers();
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
});
