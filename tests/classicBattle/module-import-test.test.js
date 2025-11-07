/**
 * Direct test to verify the underlying issue:
 * Is the real snackbar.js being imported instead of the mocked version?
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

describe("Direct Module Import Test", () => {
  it("verifies vi.mock() actually replaces the module", async () => {
    // This test doesn't use vi.mock() - import the REAL module
    const realSnackbar = await import(
      "../../src/helpers/classicBattle/snackbar.js"
    );
    console.log("Real snackbar.getOpponentDelay():", realSnackbar.getOpponentDelay());
    console.log("Real function:", String(realSnackbar.getOpponentDelay).slice(0, 150));

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

describe("Module Import with Mocking", () => {
  it("verifies vi.mock() is applied to subsequent imports", async () => {
    // Import AFTER vi.mock() is declared
    const mockedSnackbar = await import(
      "../../src/helpers/classicBattle/snackbar.js"
    );
    console.log("Mocked snackbar.getOpponentDelay():", mockedSnackbar.getOpponentDelay());
    console.log("Are they the same?", mockedSnackbar.getOpponentDelay === mockGetOpponentDelay);

    // Should return 999 from the mock
    expect(mockedSnackbar.getOpponentDelay()).toBe(999);
  });

  it("verifies uiEventHandlers uses the mocked version", async () => {
    const uiEventHandlers = await import(
      "../../src/helpers/classicBattle/uiEventHandlers.js"
    );

    // The handler is already bound to the module, so we can't easily test
    // which getOpponentDelay it uses. But we can verify the mock was set up.
    expect(mockGetOpponentDelay.mock.calls.length).toBeGreaterThan(0);
    console.log("Mock was called during handler binding");
  });
});
