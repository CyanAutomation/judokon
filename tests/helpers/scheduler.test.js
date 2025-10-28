import { describe, it, expect, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { setScheduler, getScheduler, realScheduler } from "../../src/helpers/scheduler.js";

describe("setScheduler", () => {
  afterEach(() => {
    setScheduler(realScheduler);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("falls back to real clearTimeout when scheduler omits it", () => {
    const timers = useCanonicalTimers();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    try {
      setScheduler({
        setTimeout: (...args) => realScheduler.setTimeout(...args),
        requestAnimationFrame: undefined,
        cancelAnimationFrame: undefined
      });

      const scheduler = getScheduler();
      const timerId = scheduler.setTimeout(() => {}, 50);
      scheduler.clearTimeout(timerId);

      expect(clearSpy).toHaveBeenCalled();
    } finally {
      timers.cleanup();
    }
  });

  it("retains prototype methods when injecting clearTimeout fallback", () => {
    const setSpy = vi.fn().mockReturnValue("token");

    class PrototypeScheduler {
      setTimeout(...args) {
        return setSpy(...args);
      }
    }

    const schedulerInstance = new PrototypeScheduler();

    expect(() => setScheduler(schedulerInstance)).not.toThrow();

    const scheduler = getScheduler();
    const callback = () => {};
    const token = scheduler.setTimeout(callback, 25);

    expect(setSpy).toHaveBeenCalledWith(callback, 25);
    expect(token).toBe("token");
    expect(scheduler.clearTimeout).toBe(realScheduler.clearTimeout);
  });

  it("allows schedulers without RAF when clearTimeout exists", () => {
    const nextScheduler = {
      setTimeout: vi.fn(),
      clearTimeout: vi.fn()
    };

    expect(() => setScheduler(nextScheduler)).not.toThrow();
    const scheduler = getScheduler();
    expect(scheduler.setTimeout).toBe(nextScheduler.setTimeout);
    scheduler.setTimeout(() => {});
    expect(nextScheduler.setTimeout).toHaveBeenCalled();
  });

  it("throws when setTimeout is missing", () => {
    expect(() => setScheduler({ clearTimeout: () => {} })).toThrow(/Invalid scheduler object/);
  });
});
