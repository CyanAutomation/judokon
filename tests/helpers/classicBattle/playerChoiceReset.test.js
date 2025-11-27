import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

// ===== Top-level vi.mock() calls (already mostly migrated from vi.doMock) =====
vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  drawCards: vi.fn().mockResolvedValue({}),
  _resetForTest: vi.fn()
}));

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  getRoundsPlayed: vi.fn(() => 0),
  _resetForTest: vi.fn(),
  onEngineCreated: vi.fn(() => () => {})
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn()
}));

describe.sequential("classicBattle player choice reset", () => {
  let timers;
  let battleMod;
  beforeEach(async () => {
    timers = useCanonicalTimers();
    battleMod = await import("../../../src/helpers/classicBattle.js");
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("clears store.playerChoice before each round", async () => {
    const store = battleMod.createBattleStore();

    store.playerChoice = "power";
    await battleMod.startRound(store);
    expect(store.playerChoice).toBeNull();

    store.playerChoice = "speed";
    await battleMod.startRound(store);
    expect(store.playerChoice).toBeNull();
  });
});
