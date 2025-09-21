import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  install,
  uninstall,
  enqueue,
  flushNext,
  flushAll,
  withRafMock,
  installRAFMock
} from "./rafMock.js";

/**
 * @pseudocode
 * - Test basic RAF queuing and flushing
 * - Test cancellation behavior
 * - Test nested RAF calls during flush
 * - Test withRafMock wrapper
 * - Test ordering guarantees
 */
describe("RafMock", () => {
  beforeEach(() => {
    install();
  });

  afterEach(() => {
    uninstall();
  });

  describe("basic queuing and flushing", () => {
    it("should queue callbacks and execute them in order with flushAll", () => {
      const calls = [];
      const cb1 = vi.fn(() => calls.push(1));
      const cb2 = vi.fn(() => calls.push(2));
      const cb3 = vi.fn(() => calls.push(3));

      const id1 = requestAnimationFrame(cb1);
      const id2 = requestAnimationFrame(cb2);
      const id3 = requestAnimationFrame(cb3);

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);

      flushAll();

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("should execute only next callback with flushNext", () => {
      const calls = [];
      const cb1 = vi.fn(() => calls.push(1));
      const cb2 = vi.fn(() => calls.push(2));

      requestAnimationFrame(cb1);
      requestAnimationFrame(cb2);

      flushNext();
      expect(calls).toEqual([1]);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).not.toHaveBeenCalled();

      flushNext();
      expect(calls).toEqual([1, 2]);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it("should handle empty queue gracefully", () => {
      expect(() => flushNext()).not.toThrow();
      expect(() => flushAll()).not.toThrow();
    });
  });

  describe("cancellation", () => {
    it("should cancel specific callbacks", () => {
      const calls = [];
      const cb1 = vi.fn(() => calls.push(1));
      const cb2 = vi.fn(() => calls.push(2));
      const cb3 = vi.fn(() => calls.push(3));

      requestAnimationFrame(cb1);
      const id2 = requestAnimationFrame(cb2);
      requestAnimationFrame(cb3);

      cancelAnimationFrame(id2);

      flushAll();

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).not.toHaveBeenCalled();
      expect(cb3).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([1, 3]);
    });

    it("should return true for successful cancellation", () => {
      const cb = vi.fn();
      const id = requestAnimationFrame(cb);

      const result = cancelAnimationFrame(id);
      expect(result).toBe(true);
    });

    it("should return false for non-existent ID cancellation", () => {
      const result = cancelAnimationFrame(999);
      expect(result).toBe(false);
    });

    it("should handle cancel after flush", () => {
      const cb = vi.fn();
      const id = requestAnimationFrame(cb);

      flushAll();
      const result = cancelAnimationFrame(id);
      expect(result).toBe(false); // Already executed
    });
  });

  describe("nested RAF behavior", () => {
    it("should handle RAF calls during flush (nested scheduling)", () => {
      const calls = [];

      const cb1 = vi.fn(() => {
        calls.push(1);
        requestAnimationFrame(() => calls.push(1.5));
      });
      const cb2 = vi.fn(() => calls.push(2));

      requestAnimationFrame(cb1);
      requestAnimationFrame(cb2);

      flushAll();

      expect(calls).toEqual([1, 2, 1.5]);
    });

    it("should maintain FIFO order with nested calls", () => {
      const calls = [];

      const cb1 = vi.fn(() => {
        calls.push(1);
        requestAnimationFrame(() => calls.push(1.1));
        requestAnimationFrame(() => calls.push(1.2));
      });

      requestAnimationFrame(cb1);

      flushAll();

      expect(calls).toEqual([1, 1.1, 1.2]);
    });
  });

  describe("enqueue function", () => {
    it("should manually enqueue callbacks", () => {
      const cb = vi.fn(() => {});
      const id = enqueue(cb);

      expect(typeof id).toBe("number");
      expect(id).toBeGreaterThan(0);

      flushAll();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("withRafMock wrapper", () => {
    it("should auto-install and uninstall", () => {
      // Clean up the beforeEach mock first
      uninstall();

      const originalRAF = globalThis.requestAnimationFrame;
      const originalCAF = globalThis.cancelAnimationFrame;

      const result = withRafMock(() => {
        expect(globalThis.requestAnimationFrame).not.toBe(originalRAF);
        expect(globalThis.cancelAnimationFrame).not.toBe(originalCAF);
        return "test result";
      });

      expect(result).toBe("test result");

      // Verify globals are restored
      expect(globalThis.requestAnimationFrame).toBe(originalRAF);
      expect(globalThis.cancelAnimationFrame).toBe(originalCAF);

      // Reinstall for other tests
      install();
    });

    it("should work with test logic", () => {
      const calls = [];

      withRafMock(() => {
        requestAnimationFrame(() => calls.push(1));
        requestAnimationFrame(() => calls.push(2));
        flushAll();
      });

      expect(calls).toEqual([1, 2]);
    });
  });

  describe("error handling", () => {
    it("should swallow callback errors to keep test harness stable", () => {
      const errorCb = vi.fn(() => {
        throw new Error("Test error");
      });
      const goodCb = vi.fn(() => {});

      requestAnimationFrame(errorCb);
      requestAnimationFrame(goodCb);

      expect(() => flushAll()).not.toThrow();
      expect(errorCb).toHaveBeenCalledTimes(1);
      expect(goodCb).toHaveBeenCalledTimes(1);
    });
  });

  describe("legacy compatibility", () => {
    it("should maintain installRAFMock backward compatibility", () => {
      uninstall(); // Clean up from beforeEach

      const { restore, flushAll: legacyFlushAll } = installRAFMock();

      const cb = vi.fn();
      requestAnimationFrame(cb);

      legacyFlushAll();
      expect(cb).toHaveBeenCalledTimes(1);

      restore();
    });
  });
});
