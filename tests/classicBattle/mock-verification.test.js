import { describe, it, expect, beforeAll, vi } from "vitest";

const mockGetOpponentDelay = vi.fn(() => 999);

vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  setOpponentDelay: vi.fn(),
  getOpponentDelay: mockGetOpponentDelay
}));

describe("Mock verification", () => {
  let uiEventHandlers;
  let snackbarModule;

  beforeAll(async () => {
    snackbarModule = await import("../../src/helpers/classicBattle/snackbar.js");
    uiEventHandlers = await import("../../src/helpers/classicBattle/uiEventHandlers.js");
  });

  it("verifies mockReturnValue works correctly", async () => {
    console.log("Before mockReturnValue(0):");
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());

    mockGetOpponentDelay.mockReturnValue(0);

    console.log("After mockReturnValue(0):");
    console.log("  snackbarModule.getOpponentDelay():", snackbarModule.getOpponentDelay());
    console.log("  mockGetOpponentDelay():", mockGetOpponentDelay());

    expect(snackbarModule.getOpponentDelay()).toBe(0);
    expect(mockGetOpponentDelay()).toBe(0);
  });
});
