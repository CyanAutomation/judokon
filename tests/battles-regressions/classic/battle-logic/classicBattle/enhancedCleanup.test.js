import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createResourceRegistry,
  createEnhancedCleanup,
  timerCleanup,
  eventCleanup,
  domCleanup,
  moduleCleanup,
  memoryCleanup
} from "../../../src/helpers/classicBattle/enhancedCleanup.js";

describe("Enhanced Cleanup Utilities", () => {
  describe("Resource Registry", () => {
    let registry;

    beforeEach(() => {
      registry = createResourceRegistry();
    });

    it("should register and cleanup resources by type", () => {
      const cleanupFn = vi.fn();
      registry.register("test", cleanupFn, "testId");

      registry.cleanupType("test");
      expect(cleanupFn).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", () => {
      const errorCleanupFn = vi.fn(() => {
        throw new Error("Cleanup failed");
      });
      const goodCleanupFn = vi.fn();

      registry.register("test", errorCleanupFn, "errorId");
      registry.register("test", goodCleanupFn, "goodId");

      expect(() => registry.cleanupType("test")).not.toThrow();
      expect(goodCleanupFn).toHaveBeenCalled();
    });

    it("should cleanup all resources", () => {
      const cleanupFn1 = vi.fn();
      const cleanupFn2 = vi.fn();

      registry.register("type1", cleanupFn1, "id1");
      registry.register("type2", cleanupFn2, "id2");

      registry.cleanupAll();

      expect(cleanupFn1).toHaveBeenCalled();
      expect(cleanupFn2).toHaveBeenCalled();
      expect(registry.isDisposed()).toBe(true);
    });

    it("should unregister specific resources", () => {
      const cleanupFn = vi.fn();
      registry.register("test", cleanupFn, "testId");

      registry.unregister("test", "testId");
      registry.cleanupType("test");

      expect(cleanupFn).not.toHaveBeenCalled();
    });
  });

  describe("Enhanced Cleanup", () => {
    it("should combine multiple cleanup functions", () => {
      const cleanupFn1 = vi.fn();
      const cleanupFn2 = vi.fn();
      const registry = createResourceRegistry();

      const enhancedCleanup = createEnhancedCleanup([cleanupFn1, cleanupFn2], registry);

      enhancedCleanup();

      expect(cleanupFn1).toHaveBeenCalled();
      expect(cleanupFn2).toHaveBeenCalled();
      expect(registry.isDisposed()).toBe(true);
    });

    it("should handle cleanup function errors", () => {
      const errorCleanupFn = vi.fn(() => {
        throw new Error("Cleanup failed");
      });
      const goodCleanupFn = vi.fn();

      const enhancedCleanup = createEnhancedCleanup([errorCleanupFn, goodCleanupFn]);

      expect(() => enhancedCleanup()).not.toThrow();
      expect(goodCleanupFn).toHaveBeenCalled();
    });
  });

  describe("Timer Cleanup", () => {
    let registry;

    beforeEach(() => {
      registry = createResourceRegistry();
    });

    it("should register timeout cleanup", () => {
      const mockTimeout = 123;
      timerCleanup.registerTimeout(registry, mockTimeout, "timeoutId");

      const cleanupFn = vi.fn();
      registry.register("timer", cleanupFn, "timeoutId");

      registry.cleanupType("timer");
      expect(cleanupFn).toHaveBeenCalled();
    });

    it("should register interval cleanup", () => {
      const mockInterval = 456;
      timerCleanup.registerInterval(registry, mockInterval, "intervalId");

      const cleanupFn = vi.fn();
      registry.register("timer", cleanupFn, "intervalId");

      registry.cleanupType("timer");
      expect(cleanupFn).toHaveBeenCalled();
    });

    it("should handle null/undefined timers", () => {
      expect(() => {
        timerCleanup.registerTimeout(registry, null);
        timerCleanup.registerTimeout(registry, undefined);
        timerCleanup.registerInterval(registry, null);
      }).not.toThrow();
    });
  });

  describe("Event Cleanup", () => {
    let registry;
    let mockTarget;

    beforeEach(() => {
      registry = createResourceRegistry();
      mockTarget = {
        removeEventListener: vi.fn()
      };
    });

    it("should register event listener cleanup", () => {
      const type = "click";
      const listener = vi.fn();

      eventCleanup.registerListener(registry, mockTarget, type, listener, "clickId");

      registry.cleanupType("eventListener");

      expect(mockTarget.removeEventListener).toHaveBeenCalledWith(type, listener);
    });

    it("should handle removeEventListener errors", () => {
      mockTarget.removeEventListener = vi.fn(() => {
        throw new Error("Remove failed");
      });

      expect(() =>
        eventCleanup.registerListener(registry, mockTarget, "click", vi.fn(), "clickId")
      ).not.toThrow();
    });
  });

  describe("DOM Cleanup", () => {
    let registry;
    let mockElement;

    beforeEach(() => {
      registry = createResourceRegistry();
      mockElement = {
        parentNode: {
          removeChild: vi.fn()
        }
      };
    });

    it("should register DOM element cleanup", () => {
      domCleanup.registerElement(registry, mockElement, "elementId");

      registry.cleanupType("dom");

      expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(mockElement);
    });

    it("should handle elements without parent", () => {
      mockElement.parentNode = null;

      expect(() => domCleanup.registerElement(registry, mockElement, "elementId")).not.toThrow();
    });
  });

  describe("Module Cleanup", () => {
    let registry;
    let mockCache;

    beforeEach(() => {
      registry = createResourceRegistry();
      mockCache = new Map();
      mockCache.set("key1", "value1");
      mockCache.set("key2", "value2");
    });

    it("should register module cache cleanup", () => {
      moduleCleanup.registerCache(registry, mockCache, "cacheId");

      registry.cleanupType("moduleCache");

      expect(mockCache.size).toBe(0);
    });

    it("should handle cache clear errors", () => {
      mockCache.clear = vi.fn(() => {
        throw new Error("Clear failed");
      });

      expect(() => moduleCleanup.registerCache(registry, mockCache, "cacheId")).not.toThrow();
    });
  });

  describe("Memory Cleanup", () => {
    it("should clear object references", () => {
      const obj = {
        prop1: "value1",
        prop2: "value2",
        prop3: "value3"
      };

      memoryCleanup.clearReferences(obj, ["prop1", "prop3"]);

      expect(obj.prop1).toBeNull();
      expect(obj.prop2).toBe("value2"); // Not cleared
      expect(obj.prop3).toBeNull();
    });

    it("should clear all references when no properties specified", () => {
      const obj = {
        prop1: "value1",
        prop2: "value2"
      };

      memoryCleanup.clearReferences(obj);

      expect(obj.prop1).toBeNull();
      expect(obj.prop2).toBeNull();
    });

    it("should handle non-objects gracefully", () => {
      expect(() => {
        memoryCleanup.clearReferences(null);
        memoryCleanup.clearReferences(undefined);
        memoryCleanup.clearReferences("string");
      }).not.toThrow();
    });

    it("should register reference cleanup", () => {
      const registry = createResourceRegistry();
      const obj = { test: "data" };

      memoryCleanup.registerReferenceCleanup(registry, obj, ["test"], "refId");

      registry.cleanupType("reference");

      expect(obj.test).toBeNull();
    });
  });
});
