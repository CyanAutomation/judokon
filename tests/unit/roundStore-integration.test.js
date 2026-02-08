/**
 * Integration tests for RoundStore feature flag integration
 *
 * @module tests/unit/roundStore-integration.test.js
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { roundState as roundStore } from "../../src/helpers/classicBattle/roundState.js";
import {
  initScoreboardAdapter,
  disposeScoreboardAdapter,
  whenScoreboardReady
} from "../../src/helpers/classicBattle/scoreboardAdapter.js";

// Mock setupScoreboard to track calls
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn(),
  showMessage: vi.fn(),
  clearMessage: vi.fn(),
  showTemporaryMessage: vi.fn(),
  updateTimer: vi.fn(),
  clearTimer: vi.fn(),
  showAutoSelect: vi.fn(),
  updateScore: vi.fn()
}));

describe("RoundStore Scoreboard Integration", () => {
  let mockUpdateRoundCounter;

  beforeEach(async () => {
    // Reset RoundStore
    roundStore.reset();

    // Get fresh mocks
    const setupScoreboard = await import("../../src/helpers/setupScoreboard.js");
    mockUpdateRoundCounter = setupScoreboard.updateRoundCounter;

    // Reset mocks
    mockUpdateRoundCounter.mockReset();
  });

  afterEach(() => {
    // Clean up adapter
    disposeScoreboardAdapter();
  });

  it("should wire RoundStore into scoreboard adapter", async () => {
    initScoreboardAdapter();

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

  describe("Cleanup and disposal", () => {
    it("should clean up RoundStore callbacks on dispose", async () => {
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
  });
});
