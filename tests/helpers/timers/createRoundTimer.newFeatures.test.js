import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoundTimer } from "../../../src/helpers/timers/createRoundTimer.js";

describe("createRoundTimer - new features", () => {
  let timer;

  afterEach(() => {
    if (timer) {
      timer.dispose();
    }
  });

  describe("validation", () => {
    it("throws TypeError for invalid starter", () => {
      expect(() => createRoundTimer({ starter: "invalid" })).toThrow(TypeError);
      expect(() => createRoundTimer({ starter: "invalid" })).toThrow(
        "starter must be a function or null"
      );
    });

    it("throws TypeError for invalid onDriftFail", () => {
      expect(() => createRoundTimer({ onDriftFail: "invalid" })).toThrow(TypeError);
      expect(() => createRoundTimer({ onDriftFail: "invalid" })).toThrow(
        "onDriftFail must be a function"
      );
    });

    it("throws TypeError for invalid maxDriftRetries", () => {
      expect(() => createRoundTimer({ maxDriftRetries: "invalid" })).toThrow(TypeError);
      expect(() => createRoundTimer({ maxDriftRetries: 0 })).toThrow(TypeError);
      expect(() => createRoundTimer({ maxDriftRetries: -1 })).toThrow(TypeError);
    });

    it("throws TypeError for invalid fallbackTickInterval", () => {
      expect(() => createRoundTimer({ fallbackTickInterval: "invalid" })).toThrow(TypeError);
      expect(() => createRoundTimer({ fallbackTickInterval: 0 })).toThrow(TypeError);
      expect(() => createRoundTimer({ fallbackTickInterval: -100 })).toThrow(TypeError);
    });

    it("accepts null as valid starter", () => {
      expect(() => createRoundTimer({ starter: null })).not.toThrow();
    });

    it("accepts valid configuration", () => {
      expect(() =>
        createRoundTimer({
          starter: null,
          onDriftFail: () => {},
          maxDriftRetries: 5,
          fallbackTickInterval: 500
        })
      ).not.toThrow();
    });
  });

  describe("start validation", () => {
    beforeEach(() => {
      timer = createRoundTimer();
    });

    it("throws TypeError for non-number duration", () => {
      expect(() => timer.start("invalid")).toThrow(TypeError);
      expect(() => timer.start("invalid")).toThrow("Duration must be a finite number");
    });

    it("throws TypeError for non-finite duration", () => {
      expect(() => timer.start(Infinity)).toThrow(TypeError);
      expect(() => timer.start(NaN)).toThrow(TypeError);
    });

    it("throws RangeError for negative duration", () => {
      expect(() => timer.start(-1)).toThrow(RangeError);
      expect(() => timer.start(-1)).toThrow("Duration must be non-negative");
    });

    it("accepts zero duration", () => {
      expect(() => timer.start(0)).not.toThrow();
    });

    it("accepts positive duration", () => {
      expect(() => timer.start(10)).not.toThrow();
    });
  });

  describe("event validation", () => {
    beforeEach(() => {
      timer = createRoundTimer();
    });

    it("throws TypeError for invalid event in on()", () => {
      expect(() => timer.on("invalid", () => {})).toThrow(TypeError);
      expect(() => timer.on("invalid", () => {})).toThrow(
        'Invalid event: "invalid". Must be one of: tick, expired, drift'
      );
    });

    it("throws TypeError for non-function handler in on()", () => {
      expect(() => timer.on("tick", "invalid")).toThrow(TypeError);
      expect(() => timer.on("tick", "invalid")).toThrow("Handler must be a function");
    });

    it("throws TypeError for invalid event in off()", () => {
      expect(() => timer.off("invalid", () => {})).toThrow(TypeError);
    });

    it("throws TypeError for invalid event in once()", () => {
      expect(() => timer.once("invalid", () => {})).toThrow(TypeError);
    });

    it("throws TypeError for non-function handler in once()", () => {
      expect(() => timer.once("tick", "invalid")).toThrow(TypeError);
    });

    it("accepts valid events", () => {
      const handler = () => {};
      expect(() => timer.on("tick", handler)).not.toThrow();
      expect(() => timer.on("expired", handler)).not.toThrow();
      expect(() => timer.on("drift", handler)).not.toThrow();
    });
  });

  describe("once()", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      timer = createRoundTimer();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls handler only once", async () => {
      const handler = vi.fn();
      timer.once("tick", handler);

      timer.start(3);
      await vi.runAllTimersAsync();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("removes handler after first call", async () => {
      const handler = vi.fn();
      timer.once("tick", handler);

      timer.start(3);
      await vi.advanceTimersByTimeAsync(1000);
      expect(handler).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("returns unsubscribe function", () => {
      const handler = vi.fn();
      const unsubscribe = timer.once("tick", handler);
      expect(typeof unsubscribe).toBe("function");
    });

    it("allows manual unsubscribe before event fires", async () => {
      const handler = vi.fn();
      const unsubscribe = timer.once("tick", handler);

      unsubscribe();
      timer.start(3);
      await vi.runAllTimersAsync();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("state introspection", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      timer = createRoundTimer();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("getState returns complete state", async () => {
      const state = timer.getState();
      expect(state).toHaveProperty("paused");
      expect(state).toHaveProperty("currentRemaining");
      expect(state).toHaveProperty("pausedRemaining");
      expect(state).toHaveProperty("retries");
      expect(state).toHaveProperty("isRunning");
    });

    it("isPaused returns false initially", () => {
      expect(timer.isPaused()).toBe(false);
    });

    it("isPaused returns true after pause", async () => {
      timer.start(10);
      await vi.advanceTimersByTimeAsync(1000);
      timer.pause();
      expect(timer.isPaused()).toBe(true);
    });

    it("isRunning returns false initially", () => {
      expect(timer.isRunning()).toBe(false);
    });

    it("isRunning returns true after start", async () => {
      timer.start(10);
      await vi.advanceTimersByTimeAsync(100);
      expect(timer.isRunning()).toBe(true);
    });

    it("getRemaining returns current time", async () => {
      timer.start(10);
      expect(timer.getRemaining()).toBe(10);
      await vi.advanceTimersByTimeAsync(1000);
      expect(timer.getRemaining()).toBe(9);
    });

    it("getRemaining returns paused time when paused", async () => {
      timer.start(10);
      await vi.advanceTimersByTimeAsync(2000);
      timer.pause();
      expect(timer.getRemaining()).toBe(8);
    });

    it("getRetries returns 0 initially", () => {
      expect(timer.getRetries()).toBe(0);
    });
  });

  describe("waitForExpiration", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      timer = createRoundTimer();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("resolves when timer expires", async () => {
      const promise = timer.waitForExpiration();
      timer.start(2);
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBeUndefined();
    });

    it("works with multiple waiters", async () => {
      const promise1 = timer.waitForExpiration();
      const promise2 = timer.waitForExpiration();

      timer.start(2);
      await vi.runAllTimersAsync();

      await expect(Promise.all([promise1, promise2])).resolves.toEqual([undefined, undefined]);
    });
  });

  describe("waitForNextTick", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      timer = createRoundTimer();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("resolves on next tick with remaining time", async () => {
      timer.start(5);
      await vi.advanceTimersByTimeAsync(1000);
      const promise = timer.waitForNextTick();
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).resolves.toBe(3);
    });
  });

  describe("dispose", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      timer = createRoundTimer();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("stops the timer", async () => {
      const handler = vi.fn();
      timer.on("tick", handler);
      timer.start(10);
      await vi.advanceTimersByTimeAsync(2000);

      const callCountBeforeDispose = handler.mock.calls.length;
      timer.dispose();
      await vi.advanceTimersByTimeAsync(5000);

      expect(handler).toHaveBeenCalledTimes(callCountBeforeDispose);
    });

    it("clears all listeners", () => {
      const handler = vi.fn();
      timer.on("tick", handler);
      timer.on("expired", handler);
      timer.on("drift", handler);

      timer.dispose();

      timer.start(2);
      expect(handler).not.toHaveBeenCalled();
    });

    it("resets state", async () => {
      timer.start(10);
      await vi.advanceTimersByTimeAsync(2000);
      timer.dispose();

      const state = timer.getState();
      expect(state.paused).toBe(false);
      expect(state.currentRemaining).toBe(0);
      expect(state.pausedRemaining).toBe(0);
      expect(state.retries).toBe(0);
    });
  });

  describe("configurable options", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("respects custom maxDriftRetries", () => {
      timer = createRoundTimer({ maxDriftRetries: 5 });
      expect(timer.getRetries()).toBe(0);
    });

    it("respects custom fallbackTickInterval", async () => {
      vi.useFakeTimers();
      timer = createRoundTimer({ fallbackTickInterval: 500 });
      const tickSpy = vi.fn();
      timer.on("tick", tickSpy);

      timer.start(2);
      await vi.advanceTimersByTimeAsync(500);

      expect(tickSpy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
