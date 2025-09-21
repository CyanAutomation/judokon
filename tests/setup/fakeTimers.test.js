import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useCanonicalTimers,
  withFakeTimers,
  runAllTimersAsync,
  advanceTimersByTimeAsync
} from "./fakeTimers.js";

describe("Fake Timers Setup", () => {
  describe("useCanonicalTimers", () => {
    let timers;

    beforeEach(() => {
      timers = useCanonicalTimers();
    });

    afterEach(() => {
      timers.cleanup();
    });

    it("should setup fake timers and allow cleanup", async () => {
      let called = false;
      setTimeout(() => {
        called = true;
      }, 100);

      expect(called).toBe(false);

      await timers.runAllTimersAsync();
      expect(called).toBe(true);
    });

    it("should provide advanceTimersByTimeAsync helper", async () => {
      let callCount = 0;
      setTimeout(() => callCount++, 100);
      setTimeout(() => callCount++, 200);

      expect(callCount).toBe(0);

      await timers.advanceTimersByTimeAsync(150);
      expect(callCount).toBe(1);

      await timers.advanceTimersByTimeAsync(100);
      expect(callCount).toBe(2);
    });
  });

  describe("withFakeTimers", () => {
    it("should auto-setup and cleanup fake timers", async () => {
      const result = await withFakeTimers(async () => {
        let called = false;
        setTimeout(() => {
          called = true;
        }, 100);

        await runAllTimersAsync();
        return called;
      });

      expect(result).toBe(true);
    });
  });

  describe("standalone helpers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should provide runAllTimersAsync helper", async () => {
      let called = false;
      setTimeout(() => {
        called = true;
      }, 100);

      await runAllTimersAsync();
      expect(called).toBe(true);
    });

    it("should provide advanceTimersByTimeAsync helper", async () => {
      let called = false;
      setTimeout(() => {
        called = true;
      }, 100);

      await advanceTimersByTimeAsync(100);
      expect(called).toBe(true);
    });
  });
});
