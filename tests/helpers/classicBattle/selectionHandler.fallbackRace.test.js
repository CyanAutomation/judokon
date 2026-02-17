import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

const mocks = vi.hoisted(() => ({
  getBattleState: vi.fn(() => "roundResolve"),
  getRoundEvaluatedPromise: vi.fn(() => new Promise(() => {})),
  resolveRound: vi.fn(async () => ({
    message: "fallback resolved",
    playerScore: 1,
    opponentScore: 0
  })),
  emitBattleEvent: vi.fn(),
  dispatchBattleEvent: vi.fn(),
  stopTimer: vi.fn(),
  getScores: vi.fn(() => ({ playerScore: 1, opponentScore: 0 })),
  getRoundsPlayed: vi.fn(() => 1),
  chooseOpponentStat: vi.fn(() => "power"),
  getCardStatValue: vi.fn(() => 1),
  updateScore: vi.fn(),
  clearTimer: vi.fn(),
  writeScoreDisplay: vi.fn(),
  getCurrentRound: vi.fn(() => ({ playerCard: {}, opponentCard: {}, category: "power" })),
  getScheduler: vi.fn(() => null)
}));

vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  STATS: ["power"],
  stopTimer: mocks.stopTimer,
  getScores: mocks.getScores,
  getRoundsPlayed: mocks.getRoundsPlayed
}));

vi.mock("../../../src/helpers/api/battleUI.js", () => ({
  chooseOpponentStat: mocks.chooseOpponentStat
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: mocks.emitBattleEvent
}));

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: mocks.dispatchBattleEvent
}));

vi.mock("../../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: mocks.resolveRound
}));

vi.mock("../../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: mocks.getCardStatValue
}));

vi.mock("../../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: mocks.getBattleState
}));

vi.mock("../../../src/helpers/classicBattle/promises.js", () => ({
  getRoundEvaluatedPromise: mocks.getRoundEvaluatedPromise
}));

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  updateScore: mocks.updateScore,
  clearTimer: mocks.clearTimer
}));

vi.mock("../../../src/helpers/classicBattle/scoreDisplay.js", () => ({
  writeScoreDisplay: mocks.writeScoreDisplay
}));

vi.mock("../../../src/helpers/classicBattle/roundState.js", () => ({
  roundState: {
    getCurrentRound: mocks.getCurrentRound
  }
}));

vi.mock("../../../src/helpers/scheduler.js", () => ({
  getScheduler: mocks.getScheduler
}));

describe("resolveWithFallback race handling", () => {
  beforeEach(() => {
    useCanonicalTimers();
    vi.clearAllMocks();
    document.body.dataset.battleState = "roundResolve";
    mocks.getBattleState.mockReturnValue("roundResolve");
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete document.body.dataset.battleState;
    delete document.body.dataset.prevBattleState;
  });

  it("defers fallback resolution while selection guard is in-flight", async () => {
    const { resolveWithFallback } = await import(
      "../../../src/helpers/classicBattle/selectionHandler.js"
    );

    const store = {
      orchestrator: {},
      selectionMade: true,
      playerChoice: "power",
      selectionFallbackTimeoutId: null
    };

    store[Symbol.for("classicBattle.selectionInFlight")] = true;

    const handled = await resolveWithFallback(store, "power", 1, 0, {}, undefined);
    expect(handled).toBe(true);
    expect(store.selectionFallbackTimeoutId).not.toBeNull();

    await vi.advanceTimersByTimeAsync(32);
    expect(store.playerChoice).toBe("power");
    expect(store.selectionFallbackTimeoutId).not.toBeNull();
    expect(mocks.resolveRound).not.toHaveBeenCalled();

    delete store[Symbol.for("classicBattle.selectionInFlight")];
    await vi.advanceTimersByTimeAsync(32);

    expect(mocks.resolveRound).toHaveBeenCalledTimes(1);
    expect(store.playerChoice).toBeNull();
    expect(store.selectionFallbackTimeoutId).toBeNull();
  });
});
