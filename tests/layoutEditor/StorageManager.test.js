/**
 * StorageManager.test.js - Unit tests for StorageManager component.
 *
 * @summary Tests localStorage persistence, restore, and metadata handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StorageManager } from "../../src/components/layoutEditor/StorageManager.js";

describe("StorageManager", () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new StorageManager();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("saveDraft", () => {
    it("should save layout to localStorage", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout, "classic");

      const stored = localStorage.getItem("judokon_layout_draft_classic");
      expect(stored).toBeDefined();

      const draft = JSON.parse(stored);
      expect(draft.data).toEqual(layout);
    });

    it("should include version and timestamp in draft", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout, "classic");

      const stored = localStorage.getItem("judokon_layout_draft_classic");
      const draft = JSON.parse(stored);

      expect(draft.version).toBe(1);
      expect(draft.timestamp).toBeDefined();
      expect(draft.mode).toBe("classic");
    });

    it("should use default mode if not specified", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout);

      const stored = localStorage.getItem("judokon_layout_draft_default");
      expect(stored).toBeDefined();
    });

    it("should not throw if layout is null", () => {
      expect(() => manager.saveDraft(null, "classic")).not.toThrow();
    });

    it("should handle quota exceeded gracefully", () => {
      // Fill localStorage to trigger quota exceeded
      const largeData = "x".repeat(5 * 1024 * 1024); // 5MB

      try {
        for (let i = 0; i < 100; i++) {
          localStorage.setItem(`large_${i}`, largeData);
        }
      } catch {
        // Expected - quota exceeded
      }

      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      // Should not throw
      expect(() => manager.saveDraft(layout, "classic")).not.toThrow();
    });
  });

  describe("restoreDraft", () => {
    it("should restore layout from localStorage", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout, "classic");
      const restored = manager.restoreDraft("classic");

      expect(restored).toEqual(layout);
    });

    it("should return null if draft does not exist", () => {
      const restored = manager.restoreDraft("nonexistent");
      expect(restored).toBeNull();
    });

    it("should use default mode if not specified", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout);
      const restored = manager.restoreDraft();

      expect(restored).toEqual(layout);
    });

    it("should return null if version mismatch", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout, "classic");

      // Manually change version in storage
      const stored = localStorage.getItem("judokon_layout_draft_classic");
      const draft = JSON.parse(stored);
      draft.version = 999;
      localStorage.setItem("judokon_layout_draft_classic", JSON.stringify(draft));

      const restored = manager.restoreDraft("classic");
      expect(restored).toBeNull();
    });

    it("should handle corrupted JSON gracefully", () => {
      localStorage.setItem("judokon_layout_draft_classic", "invalid json {");

      expect(() => manager.restoreDraft("classic")).not.toThrow();
      const restored = manager.restoreDraft("classic");
      expect(restored).toBeNull();
    });
  });

  describe("clearDraft", () => {
    it("should remove draft from localStorage", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout, "classic");
      expect(localStorage.getItem("judokon_layout_draft_classic")).toBeDefined();

      manager.clearDraft("classic");
      expect(localStorage.getItem("judokon_layout_draft_classic")).toBeNull();
    });

    it("should use default mode if not specified", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      manager.saveDraft(layout);
      manager.clearDraft();

      expect(localStorage.getItem("judokon_layout_draft_default")).toBeNull();
    });
  });

  describe("storage key generation", () => {
    it("should generate correct storage key", () => {
      const key = manager.getStorageKey("classic");
      expect(key).toBe("judokon_layout_draft_classic");
    });

    it("should handle special characters in mode", () => {
      const key = manager.getStorageKey("classic-v2.0");
      expect(key).toBe("judokon_layout_draft_classic-v2.0");
    });
  });
});
