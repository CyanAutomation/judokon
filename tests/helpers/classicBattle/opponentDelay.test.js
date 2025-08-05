import { describe, it, expect, vi, beforeEach } from "vitest";

let showMessage;
let clearMessage;
let scheduleNextRound;
let revealComputerCard;
let resetStatButtons;
let updateDebugPanel;

beforeEach(() => {
  vi.resetModules();
  showMessage = vi.fn();
  clearMessage = vi.fn();
  scheduleNextRound = vi.fn();
  revealComputerCard = vi.fn();
  resetStatButtons = vi.fn();
  updateDebugPanel = vi.fn();

  vi.mock("../../../src/helpers/setupBattleInfoBar.js", () => ({
    showMessage,
    clearMessage,
    showTemporaryMessage: vi.fn((msg) => {
      showMessage(msg);
      return clearMessage;
    }),
    updateScore: vi.fn(),
    startCountdown: vi.fn()
  }));

  vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
    revealComputerCard,
    updateDebugPanel,
    showSelectionPrompt: vi.fn(),
    disableNextRoundButton: vi.fn()
  }));

  vi.mock("../../../src/helpers/classicBattle/timerControl.js", () => ({
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
    vi.spyOn(mod.classicBattle, "evaluateRound").mockReturnValue({ matchEnded: false });

    const promise = mod.classicBattle.handleStatSelection(mod.simulateOpponentStat());

    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    expect(clearMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(299);
    expect(scheduleNextRound).not.toHaveBeenCalled();
    expect(clearMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(402);
    await promise;
    expect(scheduleNextRound).toHaveBeenCalled();
    expect(clearMessage).toHaveBeenCalled();
    timer.clearAllTimers();
  });
});
