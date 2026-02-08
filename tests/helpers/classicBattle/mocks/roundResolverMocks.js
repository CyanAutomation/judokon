/**
 * @file roundResolverMocks.js
 * @description Mock configuration for Classic Battle round resolver and related dependencies.
 * Used primarily by difficulty.test.js to test opponent stat selection across difficulty levels.
 *
 * @note This file uses the modern Vitest 3.x pattern with vi.hoisted() for shared mock references.
 * All mocks are registered at top-level for static analysis compatibility.
 *
 * @see {@link tests/helpers/classicBattle/difficulty.test.js} - Primary consumer
 * @see {@link AGENTS.md#modern-test-harness-architecture} - Testing patterns documentation
 */

import { vi } from "vitest";

// ============================================================================
// HOISTED MOCK STATE - Shared between vi.mock() factories and test imports
// ============================================================================

/**
 * Hoisted mock references for Classic Battle round resolution testing.
 * These are created before vi.mock() calls to enable per-test configuration.
 *
 * @type {Object} roundResolverMock - Mock for roundResolver.resolveRound()
 * @type {Object} mockBattleEngineFacade - Mocks for battle engine operations
 * @type {Object} mockEventDispatcher - Mock for event dispatching
 * @type {Object} mockBattleEvents - Mock for battle event emission
 * @type {Object} mockPromises - Mock for round resolution promises
 * @type {Object} mockTimerUtils - Mock for timer delay resolution
 * @type {Object} mockScoreboard - Mocks for scoreboard operations
 * @type {Object} mockSnackbar - Mock for snackbar display
 * @type {Object} mockScoreDisplay - Mock for score display updates
 * @type {Object} mockRoundStore - Mock for round state storage
 * @type {Object} mockEventBus - Mock for battle state queries
 */
const {
  roundResolverMock,
  mockBattleEngineFacade,
  mockEventDispatcher,
  mockBattleEvents,
  mockPromises,
  mockTimerUtils,
  mockScoreboard,
  mockSnackbar,
  mockScoreDisplay,
  mockRoundStore,
  mockEventBus
} = vi.hoisted(() => ({
  roundResolverMock: {
    resolveRound: vi.fn(async (_store, stat, playerVal, opponentVal) => ({
      stat,
      delta: playerVal - opponentVal,
      outcome:
        playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw",
      matchEnded: false,
      playerScore: playerVal > opponentVal ? 1 : 0,
      opponentScore: playerVal < opponentVal ? 1 : 0
    }))
  },
  mockBattleEngineFacade: {
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
  },
  mockEventDispatcher: {
    dispatchBattleEvent: vi.fn().mockResolvedValue(false)
  },
  mockBattleEvents: {
    emitBattleEvent: vi.fn()
  },
  mockPromises: {
    getRoundEvaluatedPromise: vi.fn(() => Promise.resolve())
  },
  mockTimerUtils: {
    resolveDelay: vi.fn(() => 0)
  },
  mockScoreboard: {
    updateScore: vi.fn(),
    clearTimer: vi.fn()
  },
  mockSnackbar: {
    showSnackbar: vi.fn()
  },
  mockScoreDisplay: {
    writeScoreDisplay: vi.fn(),
    syncScoreDisplay: vi.fn()
  },
  mockRoundStore: {
    roundState: { setSelectedStat: vi.fn() }
  },
  mockEventBus: {
    getBattleState: vi.fn(() => null)
  }
}));

// ============================================================================
// TOP-LEVEL MOCK REGISTRATIONS - Applied during Vitest module collection
// ============================================================================

vi.mock("../../../../src/helpers/BattleEngine.js", async () => {
  const actual = await vi.importActual("../../../../src/helpers/BattleEngine.js");
  return {
    ...actual,
    ...mockBattleEngineFacade
  };
});

vi.mock("../../../../src/helpers/classicBattle/eventDispatcher.js", () => mockEventDispatcher);

vi.mock("../../../../src/helpers/classicBattle/battleEvents.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ...mockBattleEvents
  };
});

vi.mock("../../../../src/helpers/classicBattle/promises.js", () => mockPromises);

vi.mock("../../../../src/helpers/classicBattle/timerUtils.js", () => mockTimerUtils);

vi.mock("../../../../src/helpers/setupScoreboard.js", () => mockScoreboard);

vi.mock("../../../../src/helpers/showSnackbar.js", () => mockSnackbar);

vi.mock("../../../../src/helpers/classicBattle/scoreDisplay.js", () => mockScoreDisplay);

vi.mock("../../../../src/helpers/classicBattle/roundState.js", () => mockRoundStore);

vi.mock("../../../../src/helpers/classicBattle/eventBus.js", () => mockEventBus);

vi.mock("../../../../src/helpers/classicBattle/roundResolver.js", () => roundResolverMock);

// ============================================================================
// EXPORTS - Hoisted mock references for use in tests
// ============================================================================

/**
 * Primary mock export for round resolution testing.
 * Use .mockClear() in beforeEach to reset between tests.
 * Use .mockImplementation() to configure per-test behavior.
 *
 * @example
 * beforeEach(() => {
 *   roundResolverMock.resolveRound.mockClear();
 * });
 *
 * @example
 * expect(roundResolverMock.resolveRound).toHaveBeenCalledWith(
 *   store, stat, playerVal, opponentVal, expect.any(Object)
 * );
 */
export { roundResolverMock };
