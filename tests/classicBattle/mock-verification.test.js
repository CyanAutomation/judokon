import { describe, it, expect, beforeAll, vi } from "vitest";

// Replicate the EXACT pattern from the failing test
const mockGetOpponentDelay = vi.fn(() => 500);

vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  setOpponentDelay: vi.fn(),
  getOpponentDelay: mockGetOpponentDelay
}));

describe("Mock verification with factory function", () => {
  let snackbarModule;

  beforeAll(async () => {
    snackbarModule = await import("../../src/helpers/classicBattle/snackbar.js");
  });

  it("verifies factory function mock works correctly", async () => {
    console.log("Initial state:");
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());

    console.log("\nAfter mockClear() + mockReturnValue(500):");
    mockGetOpponentDelay.mockClear();
    mockGetOpponentDelay.mockReturnValue(500);
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());

    console.log("\nAfter mockReturnValue(0):");
    mockGetOpponentDelay.mockReturnValue(0);
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());

    console.log("\nAfter another mockClear() + mockReturnValue(500):");
    mockGetOpponentDelay.mockClear();
    mockGetOpponentDelay.mockReturnValue(500);
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());

    console.log("\nAfter final mockReturnValue(0):");
    mockGetOpponentDelay.mockReturnValue(0);
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());

    expect(snackbarModule.getOpponentDelay()).toBe(0);
  });
});
