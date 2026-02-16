import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateBattleEngine,
  mockResetBattleEnginePreservingConfig,
  mockGetEngine,
  mockSetPointsToWin,
  mockStartRound,
  mockStartCoolDown,
  mockStopTimer,
  mockPauseTimer,
  mockResumeTimer,
  mockHandleStatSelection,
  mockQuitMatch,
  mockInterruptMatch,
  mockOn,
  mockOff,
  mockGetPointsToWin,
  mockGetScores,
  mockGetRoundsPlayed,
  mockIsMatchEnded,
  mockGetTimerState,
  mockGetCurrentStats
} = vi.hoisted(() => ({
  mockCreateBattleEngine: vi.fn(),
  mockResetBattleEnginePreservingConfig: vi.fn(),
  mockGetEngine: vi.fn(),
  mockSetPointsToWin: vi.fn(),
  mockStartRound: vi.fn(),
  mockStartCoolDown: vi.fn(),
  mockStopTimer: vi.fn(),
  mockPauseTimer: vi.fn(),
  mockResumeTimer: vi.fn(),
  mockHandleStatSelection: vi.fn(),
  mockQuitMatch: vi.fn(),
  mockInterruptMatch: vi.fn(),
  mockOn: vi.fn(),
  mockOff: vi.fn(),
  mockGetPointsToWin: vi.fn(),
  mockGetScores: vi.fn(),
  mockGetRoundsPlayed: vi.fn(),
  mockIsMatchEnded: vi.fn(),
  mockGetTimerState: vi.fn(),
  mockGetCurrentStats: vi.fn()
}));

vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  STATS: Object.freeze({ SPEED: "speed" }),
  createBattleEngine: mockCreateBattleEngine,
  resetBattleEnginePreservingConfig: mockResetBattleEnginePreservingConfig,
  getEngine: mockGetEngine,
  setPointsToWin: mockSetPointsToWin,
  startRound: mockStartRound,
  startCoolDown: mockStartCoolDown,
  stopTimer: mockStopTimer,
  pauseTimer: mockPauseTimer,
  resumeTimer: mockResumeTimer,
  handleStatSelection: mockHandleStatSelection,
  quitMatch: mockQuitMatch,
  interruptMatch: mockInterruptMatch,
  on: mockOn,
  off: mockOff,
  getPointsToWin: mockGetPointsToWin,
  getScores: mockGetScores,
  getRoundsPlayed: mockGetRoundsPlayed,
  isMatchEnded: mockIsMatchEnded,
  getTimerState: mockGetTimerState,
  getCurrentStats: mockGetCurrentStats
}));

describe("battleAppService", () => {
  beforeEach(() => {
    mockCreateBattleEngine.mockReset();
    mockResetBattleEnginePreservingConfig.mockReset();
    mockGetEngine.mockReset();
    mockSetPointsToWin.mockReset();
    mockStartRound.mockReset();
    mockStartCoolDown.mockReset();
    mockStopTimer.mockReset();
    mockPauseTimer.mockReset();
    mockResumeTimer.mockReset();
    mockHandleStatSelection.mockReset();
    mockQuitMatch.mockReset();
    mockInterruptMatch.mockReset();
    mockOn.mockReset();
    mockOff.mockReset();
    mockGetPointsToWin.mockReset().mockReturnValue(3);
    mockGetScores.mockReset().mockReturnValue({ playerScore: 1, opponentScore: 2 });
    mockGetRoundsPlayed.mockReset().mockReturnValue(5);
    mockIsMatchEnded.mockReset().mockReturnValue(false);
    mockGetTimerState.mockReset().mockReturnValue({ remaining: 12 });
    mockGetCurrentStats.mockReset().mockReturnValue({ speed: 88 });
  });

  it("dispatchIntent delegates supported intents", async () => {
    const { dispatchIntent } = await import(
      "../../../src/helpers/classicBattle/battleAppService.js"
    );

    dispatchIntent("engine.setPointsToWin", { value: 7 });
    dispatchIntent("battle.startRound", { args: ["arg-a", "arg-b"] });
    dispatchIntent("battle.interruptMatch", { reason: "manual-stop" });

    expect(mockSetPointsToWin).toHaveBeenCalledWith(7);
    expect(mockStartRound).toHaveBeenCalledWith("arg-a", "arg-b");
    expect(mockInterruptMatch).toHaveBeenCalledWith("manual-stop");
  });

  it("dispatchIntent throws for unsupported intents", async () => {
    const { dispatchIntent } = await import(
      "../../../src/helpers/classicBattle/battleAppService.js"
    );

    expect(() => dispatchIntent("unknown.intent")).toThrow("Unsupported battle app intent");
  });

  it("subscribe returns cleanup that safely calls off", async () => {
    const { subscribe } = await import("../../../src/helpers/classicBattle/battleAppService.js");

    const handler = vi.fn();
    const cleanup = subscribe("timerStopped", handler);
    cleanup();

    expect(mockOn).toHaveBeenCalledWith("timerStopped", handler);
    expect(mockOff).toHaveBeenCalledWith("timerStopped", handler);
  });

  it("subscribe returns noop cleanup when on fails", async () => {
    const { subscribe } = await import("../../../src/helpers/classicBattle/battleAppService.js");
    mockOn.mockImplementationOnce(() => {
      throw new Error("subscribe failed");
    });

    const cleanup = subscribe("timerStopped", vi.fn());

    expect(() => cleanup()).not.toThrow();
    expect(mockOff).not.toHaveBeenCalled();
  });

  it("cleanup swallows off failures", async () => {
    const { subscribe } = await import("../../../src/helpers/classicBattle/battleAppService.js");
    mockOff.mockImplementationOnce(() => {
      throw new Error("off failed");
    });

    const cleanup = subscribe("timerStopped", vi.fn());

    expect(() => cleanup()).not.toThrow();
  });

  it("getSnapshot returns immutable cloned data", async () => {
    const { getSnapshot, STATS } = await import(
      "../../../src/helpers/classicBattle/battleAppService.js"
    );

    const snapshot = getSnapshot();

    expect(snapshot).toEqual({
      pointsToWin: 3,
      scores: { playerScore: 1, opponentScore: 2 },
      roundsPlayed: 5,
      matchEnded: false,
      timerState: { remaining: 12 },
      currentStats: { speed: 88 }
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.scores)).toBe(true);
    expect(Object.isFrozen(snapshot.timerState)).toBe(true);
    expect(Object.isFrozen(snapshot.currentStats)).toBe(true);
    expect(STATS).toEqual({ SPEED: "speed" });
  });
});
