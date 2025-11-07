/**
 * Direct test to verify the underlying issue:
 * Is the real snackbar.js being imported instead of the mocked version?
 */

import { describe, it, expect, vi } from "vitest";

describe("Direct Module Import Test", () => {
  it("verifies the real module behavior without mocking", async () => {
    // This test should import the REAL module, so we use vi.importActual
    const realSnackbar = await vi.importActual("../../src/helpers/classicBattle/snackbar.js");

    // Verify it has the real implementation (module-level state)
    expect(realSnackbar.getOpponentDelay()).toBe(500);
  });
});

// NOW test with vi.mock
const mockGetOpponentDelay = vi.fn(() => 999);

vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  setOpponentDelay: vi.fn(),
  getOpponentDelay: mockGetOpponentDelay
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: vi.fn()
}));

describe("Module Import with Mocking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies vi.mock() is applied to subsequent imports", async () => {
    // Import AFTER vi.mock() is declared
    const mockedSnackbar = await import("../../src/helpers/classicBattle/snackbar.js");
    // Should return 999 from the mock
    expect(mockedSnackbar.getOpponentDelay()).toBe(999);
    expect(mockGetOpponentDelay).toHaveBeenCalledTimes(1);
  });

  it("verifies uiEventHandlers uses the mocked version via event trigger", async () => {
    const { bindUIHelperEventHandlersDynamic } = await import(
      "../../src/helpers/classicBattle/uiEventHandlers.js"
    );
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    const { isEnabled } = await import("../../src/helpers/featureFlags.js");

    // The feature flag must be enabled for the delay logic to run
    isEnabled.mockReturnValue(true);

    // Bind the handlers. Internally, this will use the mocked `getOpponentDelay`
    // because snackbar.js is mocked for this entire test suite.
    bindUIHelperEventHandlersDynamic();

    // Dispatch an event that triggers the handler that calls getOpponentDelay
    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });

    // Now, the mock should have been called by the event handler.
    expect(mockGetOpponentDelay.mock.calls.length).toBeGreaterThan(0);
  });
});
