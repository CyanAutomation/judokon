/**
 * Unit tests for roundReadyState RoundStore integration
 *
 * @module tests/unit/roundReadyState.test.js
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  setReadyDispatchedForCurrentCooldown,
  hasReadyBeenDispatchedForCurrentCooldown,
  resetReadyDispatchState
} from "../../src/helpers/classicBattle/roundReadyState.js";
import { roundStore } from "../../src/helpers/classicBattle/roundStore.js";

// Mock event dispatcher
vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  resetDispatchHistory: vi.fn()
}));

describe("roundReadyState RoundStore Integration", () => {
  let mockResetDispatchHistory;

  beforeEach(async () => {
    // Reset RoundStore
    roundStore.reset();

    // Get fresh mock
    const eventDispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    mockResetDispatchHistory = eventDispatcher.resetDispatchHistory;
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
