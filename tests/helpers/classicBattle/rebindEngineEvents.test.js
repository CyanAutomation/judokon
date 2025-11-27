import { describe, it, expect, vi } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockOn, mockCreateBattleEngine, mockOnEngineCreated } = vi.hoisted(() => ({
  mockOn: vi.fn(),
  mockCreateBattleEngine: vi.fn(),
  mockOnEngineCreated: vi.fn(() => () => {})
}));

// ===== Top-level vi.mock() call (Vitest static analysis phase) =====
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  createBattleEngine: mockCreateBattleEngine,
  on: mockOn,
  onEngineCreated: mockOnEngineCreated
}));

// Ensure engine events are rebound when resetting the game.
describe("_resetForTest", () => {
  it("rebinds engine events after engine recreation", async () => {
    vi.resetModules();
    const { initClassicBattleTest } = await import("../initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });
    const { _resetForTest } = await import("../../../src/helpers/classicBattle/roundManager.js");
    mockOn.mockClear();
    _resetForTest({});
    expect(mockOn).toHaveBeenCalledWith("roundEnded", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("matchEnded", expect.any(Function));
  });
});
