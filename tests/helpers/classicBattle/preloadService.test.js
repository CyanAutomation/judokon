import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  initPreloadServices,
  getCachedModule,
  clearPreloadCache,
  getPerformanceMetrics,
  performMemoryCleanup,
  registerWeakReference,
  registerCleanup
} from "../preloadService.js";

describe("Preload Service", () => {
  beforeEach(() => {
    clearPreloadCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearPreloadCache();
  });

  describe("Performance Monitoring", () => {
    it("should track performance metrics", () => {
      initPreloadServices();
      const metrics = getPerformanceMetrics();

      expect(metrics).toHaveProperty("preloadStartTime");
      expect(metrics).toHaveProperty("cacheHitRate");
      expect(metrics).toHaveProperty("averageLoadTime");
      expect(typeof metrics.preloadStartTime).toBe("number");
    });

    it("should record memory usage when available", () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 5000000
      };

      Object.defineProperty(window, "performance", {
        value: { memory: mockMemory },
        writable: true
      });

      performMemoryCleanup();
      const metrics = getPerformanceMetrics();

      expect(metrics.memoryUsage).toBeDefined();
      expect(Array.isArray(metrics.memoryUsage)).toBe(true);
    });
  });

  describe("Memory Management", () => {
    it("should register cleanup functions", () => {
      const cleanupFn = vi.fn();
      registerCleanup(cleanupFn);

      performMemoryCleanup();
      expect(cleanupFn).toHaveBeenCalled();
    });

    it("should handle cleanup function errors gracefully", () => {
      const errorCleanupFn = vi.fn(() => {
        throw new Error("Cleanup failed");
      });
      const goodCleanupFn = vi.fn();

      registerCleanup(errorCleanupFn);
      registerCleanup(goodCleanupFn);

      // Should not throw
      expect(() => performMemoryCleanup()).not.toThrow();
      expect(goodCleanupFn).toHaveBeenCalled();
    });

    it("should register weak references", () => {
      const obj = { test: "data" };
      const cleanupFn = vi.fn();

      registerWeakReference(obj, cleanupFn);

      // Weak references are hard to test directly, but we can verify
      // the function doesn't throw
      expect(() => registerWeakReference(obj, cleanupFn)).not.toThrow();
    });
  });

  describe("Cache Management", () => {
    it("should clear cache successfully", () => {
      // Add something to cache first
      initPreloadServices();

      // Verify cache is cleared
      clearPreloadCache();
      expect(getCachedModule("battleEngine")).toBeNull();
    });

    it("should handle cache operations gracefully", () => {
      expect(getCachedModule("nonexistent")).toBeNull();
      expect(() => clearPreloadCache()).not.toThrow();
    });
  });

  describe("Initialization", () => {
    it("should initialize preload services without errors", () => {
      expect(() => initPreloadServices()).not.toThrow();
    });

    it("should handle multiple initializations", () => {
      expect(() => {
        initPreloadServices();
        initPreloadServices();
      }).not.toThrow();
    });
  });
});
