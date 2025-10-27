import { describe, it, expect, afterEach, vi } from "vitest";
import { setScheduler, getScheduler, realScheduler } from "../../src/helpers/scheduler.js";

describe("setScheduler", () => {
  afterEach(() => {
    setScheduler(realScheduler);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("falls back to real clearTimeout when scheduler omits it", () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    setScheduler({
      setTimeout: (...args) => realScheduler.setTimeout(...args),
      requestAnimationFrame: undefined,
      cancelAnimationFrame: undefined
    });

    const scheduler = getScheduler();
    const timerId = scheduler.setTimeout(() => {}, 50);
    scheduler.clearTimeout(timerId);

    expect(clearSpy).toHaveBeenCalled();
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
    expect(() => setScheduler({ clearTimeout: () => {} })).toThrow(
      /Invalid scheduler object/
    );
  });
});
