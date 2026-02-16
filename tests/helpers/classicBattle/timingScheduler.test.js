import { describe, expect, it, vi } from "vitest";
import {
  createHeadlessScheduler,
  createTimeScheduler,
  ensureClassicBattleScheduler
} from "../../../src/helpers/classicBattle/timingScheduler.js";

describe("timingScheduler", () => {
  it("provides virtual headless scheduling with deterministic advance", () => {
    const scheduler = createHeadlessScheduler({ mode: "virtual" });
    const calls = [];

    scheduler.schedule(() => calls.push("late"), 20);
    scheduler.schedule(() => calls.push("soon"), 10);

    scheduler.advanceBy(9);
    expect(calls).toEqual([]);

    scheduler.advanceBy(1);
    expect(calls).toEqual(["soon"]);

    scheduler.advanceBy(10);
    expect(calls).toEqual(["soon", "late"]);
  });

  it("normalizes legacy timeout schedulers", () => {
    const clearTimeout = vi.fn();
    const legacy = {
      setTimeout: vi.fn((cb) => {
        cb();
        return "id-1";
      }),
      clearTimeout,
      now: () => 42
    };

    const scheduler = ensureClassicBattleScheduler(legacy);
    const callback = vi.fn();
    const handle = scheduler.schedule(callback, 5);
    scheduler.cancel(handle);

    expect(handle).toBe("id-1");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(clearTimeout).toHaveBeenCalledWith("id-1");
    expect(scheduler.now()).toBe(42);
  });

  it("falls back to time scheduler when none is provided", () => {
    const scheduler = ensureClassicBattleScheduler(null);
    const concrete = createTimeScheduler();

    expect(typeof scheduler.schedule).toBe("function");
    expect(typeof scheduler.cancel).toBe("function");
    expect(typeof scheduler.now).toBe("function");
    expect(typeof concrete.schedule).toBe("function");
  });
});
