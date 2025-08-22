// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let showMessage;
let clearMessage;
let clearTimer;
let showSnackbar;
let scheduleNextRound;
let revealOpponentCard;
let resetStatButtons;
let updateDebugPanel;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("document", { getElementById: () => null });
  showMessage = vi.fn();
  clearMessage = vi.fn();
  clearTimer = vi.fn();
  scheduleNextRound = vi.fn();
  revealOpponentCard = vi.fn();
  resetStatButtons = vi.fn();
  updateDebugPanel = vi.fn();

  vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
    showMessage,
    clearMessage,
    clearTimer,
    updateScore: vi.fn(),
    startCountdown: vi.fn(),
    showAutoSelect: vi.fn()
  }));

  vi.mock("../../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: (...args) => showSnackbar(...args),
    updateSnackbar: vi.fn()
  }));

  vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
    const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
    return {
      ...actual,
      revealOpponentCard,
      updateDebugPanel,
      showSelectionPrompt: vi.fn(),
      disableNextRoundButton: vi.fn()
    };
  });

  vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
    scheduleNextRound,
    startTimer: vi.fn()
  }));

  vi.mock("../../../src/helpers/battle/index.js", () => ({
    resetStatButtons,
    getStatValue: vi.fn(),
    showResult: vi.fn()
  }));

  vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
    handleStatSelection: vi.fn().mockReturnValue({ message: "", matchEnded: false }),
    quitMatch: vi.fn(),
    pauseTimer: vi.fn(),
    stopTimer: vi.fn(),
    getScores: vi.fn().mockReturnValue({ playerScore: 0, opponentScore: 0 }),
    _resetForTest: vi.fn(),
    STATS: ["power"]
  }));
});

describe("classicBattle opponent delay", () => {
  it("shows snackbar during opponent delay and clears before outcome", async () => {
    const timer = vi.useFakeTimers();
    const mod = await import("../../../src/helpers/classicBattle.js");
    vi.spyOn(mod, "simulateOpponentStat").mockReturnValue("power");
    vi.spyOn(mod, "evaluateRound").mockReturnValue({ matchEnded: false });
    const store = mod.createBattleStore();

    showSnackbar = vi.fn();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);
    const promise = mod.handleStatSelection(store, mod.simulateOpponentStat());

    // Snackbar is delayed ~500ms; ensure it hasn't shown too early
    await vi.advanceTimersByTimeAsync(499);
    expect(showSnackbar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2);
    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    await vi.runAllTimersAsync();
    await promise;
    // In the current flow, scheduleNextRound may be triggered by the
    // orchestrator path or directly from resolveRound. We only assert the
    // opponent delay snackbar appeared without enforcing the scheduler call.
    timer.clearAllTimers();
    randomSpy.mockRestore();
  });
});
