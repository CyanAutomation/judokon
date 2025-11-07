/**
 * Unit tests for roundReadyState RoundStore integration
 *
 * @module tests/unit/roundReadyState.test.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock event dispatcher before any imports
vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  resetDispatchHistory: vi.fn()
}));

describe("roundReadyState RoundStore Integration", () => {
  let mockResetDispatchHistory;
  let setReadyDispatchedForCurrentCooldown;
  let hasReadyBeenDispatchedForCurrentCooldown;
  let resetReadyDispatchState;
  let roundStore;

  beforeEach(async () => {
    // Clear module cache to ensure fresh imports with mocks applied
    vi.resetModules();

    // Re-declare mocks after reset
    vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      resetDispatchHistory: vi.fn()
    }));

    // Import modules after setting up mocks
    const eventDispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    mockResetDispatchHistory = eventDispatcher.resetDispatchHistory;

    const roundReadyStateModule = await import(
      "../../src/helpers/classicBattle/roundReadyState.js"
    );
    setReadyDispatchedForCurrentCooldown =
      roundReadyStateModule.setReadyDispatchedForCurrentCooldown;
    hasReadyBeenDispatchedForCurrentCooldown =
      roundReadyStateModule.hasReadyBeenDispatchedForCurrentCooldown;
    resetReadyDispatchState = roundReadyStateModule.resetReadyDispatchState;

    const roundStoreModule = await import("../../src/helpers/classicBattle/roundStore.js");
    roundStore = roundStoreModule.roundStore;

    // Reset RoundStore
    roundStore.reset();
    mockResetDispatchHistory.mockReset();
  });

  describe("ready dispatch state management", () => {
    it("should track ready dispatch state via RoundStore", () => {
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);
      expect(roundStore.isReadyDispatched()).toBe(true);

      setReadyDispatchedForCurrentCooldown(false);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
      expect(roundStore.isReadyDispatched()).toBe(false);
    });

    it("should reset dispatch state", () => {
      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      resetReadyDispatchState();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
      expect(roundStore.isReadyDispatched()).toBe(false);
      expect(mockResetDispatchHistory).toHaveBeenCalledWith("ready");
    });
  });

  describe("API compatibility", () => {
    it("should maintain boolean coercion behavior", () => {
      // Test strict equality with true
      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      setReadyDispatchedForCurrentCooldown(false);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      // Test that only exact true sets it to true
      setReadyDispatchedForCurrentCooldown(1);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(0);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown("true");
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(null);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    });

    it("should handle multiple state changes", () => {
      // Test multiple transitions
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      setReadyDispatchedForCurrentCooldown(true); // Should remain true
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      setReadyDispatchedForCurrentCooldown(false);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(false); // Should remain false
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    });
  });
});
