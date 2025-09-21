/**
 * Integration tests for roundReadyState RoundStore migration
 *
 * @module tests/unit/roundReadyState-migration.test.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setReadyDispatchedForCurrentCooldown,
  hasReadyBeenDispatchedForCurrentCooldown,
  resetReadyDispatchState
} from "../../src/helpers/classicBattle/roundReadyState.js";
import { roundStore } from "../../src/helpers/classicBattle/roundStore.js";

// Mock the feature flags module
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: vi.fn()
}));

// Mock event dispatcher
vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  resetDispatchHistory: vi.fn()
}));

describe("roundReadyState RoundStore Migration", () => {
  let mockIsEnabled;
  let mockResetDispatchHistory;

  beforeEach(async () => {
    // Reset RoundStore
    roundStore.reset();

    // Get fresh mocks
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    mockIsEnabled = featureFlags.isEnabled;

    const eventDispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    mockResetDispatchHistory = eventDispatcher.resetDispatchHistory;

    // Reset mocks
    mockIsEnabled.mockReset();
    mockResetDispatchHistory.mockReset();
  });

  describe("Legacy behavior (feature flag disabled)", () => {
    beforeEach(() => {
      mockIsEnabled.mockReturnValue(false);
    });

    it("should use module-level flag for tracking", () => {
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      setReadyDispatchedForCurrentCooldown(false);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    });

    it("should reset dispatch state", () => {
      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      resetReadyDispatchState();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
      expect(mockResetDispatchHistory).toHaveBeenCalledWith("ready");
    });

    it("should not interact with RoundStore", () => {
      // Ensure RoundStore state doesn't affect legacy behavior
      roundStore.markReadyDispatched();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(true);
      expect(roundStore.isReadyDispatched()).toBe(true); // RoundStore still has its own state
    });
  });

  describe("RoundStore behavior (feature flag enabled)", () => {
    beforeEach(() => {
      mockIsEnabled.mockReturnValue(true);
    });

    it("should delegate to RoundStore for tracking", () => {
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      setReadyDispatchedForCurrentCooldown(true);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);
      expect(roundStore.isReadyDispatched()).toBe(true);

      setReadyDispatchedForCurrentCooldown(false);
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
      expect(roundStore.isReadyDispatched()).toBe(false);
    });

    it("should reset RoundStore dispatch state", () => {
      roundStore.markReadyDispatched();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      resetReadyDispatchState();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
      expect(roundStore.isReadyDispatched()).toBe(false);
      expect(mockResetDispatchHistory).toHaveBeenCalledWith("ready");
    });

    it("should handle RoundStore state changes directly", () => {
      // Direct RoundStore changes should be reflected
      roundStore.markReadyDispatched();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

      roundStore.resetReadyDispatch();
      expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    });
  });

  describe("Migration parity", () => {
    it("should maintain API compatibility", () => {
      // Test that all functions work the same regardless of flag
      const testCases = [false, true];

      for (const flagValue of testCases) {
        mockIsEnabled.mockReturnValue(flagValue);

        // Reset state
        resetReadyDispatchState();
        expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

        // Set to true
        setReadyDispatchedForCurrentCooldown(true);
        expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

        // Set to false
        setReadyDispatchedForCurrentCooldown(false);
        expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

        // Reset
        setReadyDispatchedForCurrentCooldown(true);
        resetReadyDispatchState();
        expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
      }
    });

    it("should handle boolean coercion correctly", () => {
      mockIsEnabled.mockReturnValue(true);

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
  });
});
