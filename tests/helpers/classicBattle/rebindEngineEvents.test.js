import { describe, it, expect, vi } from "vitest";

// Ensure engine events are rebound when resetting the game.
describe("_resetForTest", () => {
  it("rebinds engine events after engine recreation", async () => {
    vi.resetModules();
    const on = vi.fn();
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      createBattleEngine: vi.fn(),
      on
    }));
    const { initClassicBattleTest } = await import("../initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });
    const { _resetForTest } = await import("../../../src/helpers/classicBattle/roundManager.js");
    on.mockClear();
    _resetForTest({});
    expect(on).toHaveBeenCalledWith("roundEnded", expect.any(Function));
    expect(on).toHaveBeenCalledWith("matchEnded", expect.any(Function));
  });
});
