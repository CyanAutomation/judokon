import { vi } from "vitest";

export const roundResolverMock = {
  resolveRound: vi.fn(async (_store, stat, playerVal, opponentVal) => ({
    stat,
    delta: playerVal - opponentVal,
    outcome:
      playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw",
    matchEnded: false,
    playerScore: playerVal > opponentVal ? 1 : 0,
    opponentScore: playerVal < opponentVal ? 1 : 0
  }))
};

vi.mock("../../../../src/helpers/battleEngineFacade.js", async () => {
  const actual = await vi.importActual("../../../../src/helpers/battleEngineFacade.js");
  return {
    ...actual,
    stopTimer: vi.fn(),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
    handleStatSelection: vi.fn((playerVal, opponentVal) => ({
      delta: playerVal - opponentVal,
      outcome:
        playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw",
      matchEnded: false,
      playerScore: playerVal > opponentVal ? 1 : 0,
      opponentScore: playerVal < opponentVal ? 1 : 0
    }))
  };
});

vi.mock("../../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn().mockResolvedValue(false)
}));

vi.mock("../../../../src/helpers/classicBattle/battleEvents.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    emitBattleEvent: vi.fn()
  };
});

vi.mock("../../../../src/helpers/classicBattle/promises.js", () => ({
  getRoundResolvedPromise: vi.fn(() => Promise.resolve())
}));

vi.mock("../../../../src/helpers/classicBattle/timerUtils.js", () => ({
  resolveDelay: vi.fn(() => 0)
}));

vi.mock("../../../../src/helpers/setupScoreboard.js", () => ({
  updateScore: vi.fn(),
  clearTimer: vi.fn()
}));

vi.mock("../../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));

vi.mock("../../../../src/helpers/classicBattle/scoreDisplay.js", () => ({
  writeScoreDisplay: vi.fn()
}));

vi.mock("../../../../src/helpers/classicBattle/roundStore.js", () => ({
  roundStore: { setSelectedStat: vi.fn() }
}));

vi.mock("../../../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn(() => null)
}));

vi.mock("../../../../src/helpers/classicBattle/roundResolver.js", () => roundResolverMock);
