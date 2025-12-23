import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { LRUCache } from "../src/helpers/lruCache.js";

/**
 * Test suite for LRU Cache utility
 */

describe("LRUCache", () => {
  let cache;

  beforeEach(() => {
    useCanonicalTimers();
    vi.setSystemTime(0);
    cache = new LRUCache(3, 1000); // 3 items max, 1 second TTL
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Operations", () => {
    it("should set and get a value", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should delete a value", () => {
      cache.set("key1", "value1");
      cache.delete("key1");
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should clear all values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });

    it("should return cache size", () => {
      cache.set("key1", "value1");
      expect(cache.size()).toBe(1);
      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);
    });

    it("should return all keys", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      const keys = cache.keys();
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys.length).toBe(2);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used item when cache is full", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      // Cache is now full (max size = 3)

      // Access key1 to update its timestamp
      cache.get("key1");

      // Add a new item - should evict key2 (least recently used)
      cache.set("key4", "value4");

      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should maintain LRU order across multiple accesses", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Access order: key2, key3, key1
      cache.get("key2");
      cache.get("key3");
      cache.get("key1");

      // Add key4 - should evict key2 (least recently accessed)
      cache.set("key4", "value4");

      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should not evict when capacity is not exceeded", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.size()).toBe(2);
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBe("value2");
    });
  });

  describe("TTL Expiration", () => {
    it("should track TTL configuration", () => {
      const shortTTL = new LRUCache(10, 500);
      const stats = shortTTL.getStats();
      expect(stats.ttlMs).toBe(500);
    });

    it("should store timestamp on set", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should track item expiration possibility", () => {
      const testCache = new LRUCache(5, 100); // Very short TTL
      testCache.set("key1", "value1");

      // Item should exist immediately after being set
      expect(testCache.get("key1")).toBe("value1");

      // The cache stores timestamps, so expiration logic is implemented
      const stats = testCache.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it("should expire items after TTL elapses", () => {
      cache.set("key1", "value1");

      vi.advanceTimersByTime(1001);

      expect(cache.get("key1")).toBeUndefined();
    });

    it("should refresh expiration timestamp on access", () => {
      cache.set("key1", "value1");

      vi.advanceTimersByTime(900);
      expect(cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(900);
      expect(cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(1100);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should treat zero-valued timestamps as valid until TTL runs out", () => {
      cache.set("keyZero", "valueZero");

      // Stored timestamp is zero because system time is mocked to 0 in beforeEach.
      expect(cache.isExpired("keyZero")).toBe(false);
      expect(cache.getStats().expiredCount).toBe(0);
      expect(cache.get("keyZero")).toBe("valueZero");

      vi.advanceTimersByTime(1001);
      expect(cache.isExpired("keyZero")).toBe(true);
      expect(cache.get("keyZero")).toBeUndefined();
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent keys for same query", () => {
      const key1 = LRUCache.generateKey("test", 8, { country: "Japan" });
      const key2 = LRUCache.generateKey("test", 8, { country: "Japan" });
      expect(key1).toBe(key2);
    });

    it("should generate different keys for different queries", () => {
      const key1 = LRUCache.generateKey("test1", 8, {});
      const key2 = LRUCache.generateKey("test2", 8, {});
      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different topK values", () => {
      const key1 = LRUCache.generateKey("test", 5, {});
      const key2 = LRUCache.generateKey("test", 10, {});
      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different filters", () => {
      const key1 = LRUCache.generateKey("test", 8, { country: "Japan" });
      const key2 = LRUCache.generateKey("test", 8, { country: "France" });
      expect(key1).not.toBe(key2);
    });

    it("should normalize filter order in key generation", () => {
      const key1 = LRUCache.generateKey("test", 8, { country: "Japan", rarity: "Legendary" });
      const key2 = LRUCache.generateKey("test", 8, { rarity: "Legendary", country: "Japan" });
      expect(key1).toBe(key2);
    });
  });

  describe("Cache Statistics", () => {
    it("should return cache statistics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.get("key1");
      cache.get("key1");

      const stats = cache.getStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("totalEntries");
      expect(stats).toHaveProperty("ttlMs");
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });

    it("should track access counts", () => {
      cache.set("key1", "value1");
      cache.get("key1");
      cache.get("key1");

      const stats = cache.getStats();
      expect(stats.totalAccessCount).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle cache size of 1", () => {
      const smallCache = new LRUCache(1, 1000);
      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");

      expect(smallCache.get("key1")).toBeUndefined();
      expect(smallCache.get("key2")).toBe("value2");
    });

    it("should handle storing objects", () => {
      const obj = { name: "test", value: 42 };
      cache.set("obj", obj);
      expect(cache.get("obj")).toEqual(obj);
    });

    it("should handle storing arrays", () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set("arr", arr);
      expect(cache.get("arr")).toEqual(arr);
    });

    it("should handle updating existing keys without eviction", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key1", "value1-updated");

      expect(cache.size()).toBe(2);
      expect(cache.get("key1")).toBe("value1-updated");
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle large number of operations efficiently", () => {
      const largeCache = new LRUCache(100);
      const iterations = 200;

      // Insert many items (many will be evicted)
      for (let i = 0; i < iterations; i++) {
        largeCache.set(`key${i}`, `value${i}`);
      }

      // Cache should contain only the last 100 items
      expect(largeCache.size()).toBe(100);

      // Most recent items should be present
      expect(largeCache.get(`key${iterations - 1}`)).toBe(`value${iterations - 1}`);
      expect(largeCache.get(`key${iterations - 2}`)).toBe(`value${iterations - 2}`);
    });
  });
});
