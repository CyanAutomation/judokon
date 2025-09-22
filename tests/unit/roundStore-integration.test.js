/**
 * Integration tests for RoundStore feature flag integration
 *
 * @module tests/unit/roundStore-integration.test.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { roundStore } from "../../src/helpers/classicBattle/roundStore.js";
import {
  initScoreboardAdapter,
  disposeScoreboardAdapter,
  whenScoreboardReady
} from "../../src/helpers/classicBattle/scoreboardAdapter.js";

// Mock the feature flags module
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: vi.fn()
}));

// Mock setupScoreboard to track calls
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  updateRoundCounter: vi.fn(),
  showMessage: vi.fn(),
  clearMessage: vi.fn(),
  updateTimer: vi.fn(),
  clearTimer: vi.fn(),
  updateScore: vi.fn()
}));

describe("RoundStore Feature Flag Integration", () => {
  let mockIsEnabled;
  let mockUpdateRoundCounter;

  beforeEach(async () => {
    // Reset RoundStore
    roundStore.reset();

    // Get fresh mocks
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    mockIsEnabled = featureFlags.isEnabled;

    const setupScoreboard = await import("../../src/helpers/setupScoreboard.js");
    mockUpdateRoundCounter = setupScoreboard.updateRoundCounter;

    // Reset mocks
    mockIsEnabled.mockReset();
    mockUpdateRoundCounter.mockReset();
  });

  afterEach(() => {
    // Clean up adapter
    disposeScoreboardAdapter();
  });

  describe("Legacy behavior (feature flag disabled)", () => {
    beforeEach(() => {
      mockIsEnabled.mockReturnValue(false);
    });

    it("should not wire RoundStore into scoreboard adapter", async () => {
      initScoreboardAdapter();

      // RoundStore should not have scoreboard callbacks
      expect(roundStore.callbacks.onRoundNumberChange).toBeUndefined();

      // Setting round number should still emit events for backward compatibility
      // but should not directly call updateRoundCounter (that's done via events)
      roundStore.setRoundNumber(5);
      // Note: updateRoundCounter might be called through event binding, but not directly
      // The key is that RoundStore callbacks should not be set
    });

    it("should use legacy event system for round updates", async () => {
      initScoreboardAdapter();

      // Simulate legacy event (this would normally come from battle events)
      // Note: We can't easily test the full event flow without more complex setup
      // but we can verify the adapter was initialized without RoundStore wiring
      expect(mockIsEnabled).toHaveBeenCalledWith("roundStore");
    });
  });

  describe("RoundStore behavior (feature flag enabled)", () => {
    beforeEach(() => {
      mockIsEnabled.mockReturnValue(true);
    });

    it("should wire RoundStore into scoreboard adapter", async () => {
      initScoreboardAdapter();

      // Should have called isEnabled to check flag
      expect(mockIsEnabled).toHaveBeenCalledWith("roundStore");

      // Wait for async wiring to complete deterministically
      await whenScoreboardReady();

      // RoundStore should now have scoreboard callback
      expect(typeof roundStore.callbacks.onRoundNumberChange).toBe("function");
    });

    it("should update scoreboard when round number changes", async () => {
      initScoreboardAdapter();

      // Wait for wiring to resolve
      await whenScoreboardReady();

      // Set round number - should call updateRoundCounter
      roundStore.setRoundNumber(3);

      expect(mockUpdateRoundCounter).toHaveBeenCalledWith(3);
    });

    it("should set initial round counter if round already started", async () => {
      // Set round number before initializing adapter
      roundStore.setRoundNumber(2);

      initScoreboardAdapter();

      // Wait for wiring promise to resolve
      await whenScoreboardReady();

      // Should have called updateRoundCounter with initial value
      expect(mockUpdateRoundCounter).toHaveBeenCalledWith(2);
    });

    it("should handle scoreboard update errors gracefully", async () => {
      mockUpdateRoundCounter.mockImplementation(() => {
        throw new Error("Scoreboard error");
      });

      initScoreboardAdapter();

      // Wait for wiring promise to resolve
      await whenScoreboardReady();

      // This should not throw, errors should be caught internally
      expect(() => roundStore.setRoundNumber(1)).not.toThrow();
    });
  });

  describe("Cleanup and disposal", () => {
    it("should clean up RoundStore callbacks on dispose", async () => {
      mockIsEnabled.mockReturnValue(true);

      initScoreboardAdapter();

      // Wait for deterministic wiring hook
      await whenScoreboardReady();

      // Verify callback is set
      expect(typeof roundStore.callbacks.onRoundNumberChange).toBe("function");

      // Dispose
      disposeScoreboardAdapter();

      // Callback should be cleared
      expect(roundStore.callbacks.onRoundNumberChange).toBeNull();
    });

    it("should handle dispose safely when RoundStore not wired", () => {
      mockIsEnabled.mockReturnValue(false);

      initScoreboardAdapter();

      // Initially should be undefined
      expect(roundStore.callbacks.onRoundNumberChange).toBeUndefined();

      disposeScoreboardAdapter();

      // Should remain undefined (disconnect only affects when it was actually wired)
      expect(roundStore.callbacks.onRoundNumberChange).toBeUndefined();
    });
  });
});
