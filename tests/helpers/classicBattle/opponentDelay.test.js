// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let showMessage;
let clearMessage;
let clearTimer;
let scheduleNextRound;
let revealComputerCard;
let resetStatButtons;
let updateDebugPanel;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("document", { getElementById: () => null });
  showMessage = vi.fn();
  clearMessage = vi.fn();
  clearTimer = vi.fn();
  scheduleNextRound = vi.fn();
  revealComputerCard = vi.fn();
  resetStatButtons = vi.fn();
  updateDebugPanel = vi.fn();

  vi.mock("../../../src/helpers/setupBattleInfoBar.js", () => ({
    showMessage,
    clearMessage,
    clearTimer,
    updateScore: vi.fn(),
    startCountdown: vi.fn(),
    showAutoSelect: vi.fn()
  }));

  vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
    revealComputerCard,
    updateDebugPanel,
    showSelectionPrompt: vi.fn(),
    disableNextRoundButton: vi.fn()
  }));

  vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
    scheduleNextRound,
    startTimer: vi.fn()
  }));

  vi.mock("../../../src/helpers/battle/index.js", () => ({
    resetStatButtons,
    getStatValue: vi.fn(),
    showResult: vi.fn()
  }));

  vi.mock("../../../src/helpers/battleEngine.js", () => ({
    handleStatSelection: vi.fn().mockReturnValue({ message: "", matchEnded: false }),
    quitMatch: vi.fn(),
    pauseTimer: vi.fn(),
    stopTimer: vi.fn(),
    getScores: vi.fn().mockReturnValue({ playerScore: 0, computerScore: 0 }),
    _resetForTest: vi.fn(),
    STATS: ["power"]
  }));
});

describe("classicBattle opponent delay", () => {
  it("shows waiting message during delay and clears after timeout", async () => {
    const timer = vi.useFakeTimers();
    const mod = await import("../../../src/helpers/classicBattle.js");
    vi.spyOn(mod, "simulateOpponentStat").mockReturnValue("power");
    vi.spyOn(mod, "evaluateRound").mockReturnValue({ matchEnded: false });
    const store = mod.createBattleStore();

    const promise = mod.handleStatSelection(store, mod.simulateOpponentStat());

    expect(showMessage).toHaveBeenCalledWith("Opponent is choosing…");

    await vi.advanceTimersByTimeAsync(299);
    expect(scheduleNextRound).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(402);
    await promise;
    expect(scheduleNextRound).toHaveBeenCalled();
    timer.clearAllTimers();
  });
});
