import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("classicBattle backend sync failures", () => {
  it("shows waiting message when timer sync fails", async () => {
    document.body.innerHTML = '<p id="next-round-timer"></p>';
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupBattleInfoBar.js", () => ({ showMessage }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: vi.fn().mockRejectedValue(new Error("fail"))
    }));
    vi.doMock("../../../src/helpers/battleEngine.js", () => ({
      startRound: vi.fn(),
      startCoolDown: vi.fn(),
      STATS: ["power"]
    }));
    const { startTimer } = await import("../../../src/helpers/classicBattle/timerControl.js");
    await startTimer(() => {});
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
  });

  it("restarts timer when drift exceeds threshold", async () => {
    document.body.innerHTML = '<p id="next-round-timer"></p>';
    vi.useFakeTimers();
    const showMessage = vi.fn();
    const startRound = vi.fn();
    const getTimerState = vi.fn().mockReturnValue({ remaining: 30, paused: false });
    vi.doMock("../../../src/helpers/setupBattleInfoBar.js", () => ({ showMessage }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: vi.fn().mockResolvedValue(30)
    }));
    vi.doMock("../../../src/helpers/battleEngine.js", () => ({
      startRound,
      startCoolDown: vi.fn(),
      STATS: ["power"],
      getTimerState
    }));
    const { startTimer } = await import("../../../src/helpers/classicBattle/timerControl.js");
    await startTimer(() => {});
    vi.advanceTimersByTime(5000);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    expect(startRound).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("shows waiting message when score sync fails", async () => {
    const showMessage = vi.fn();
    const updateScore = vi.fn();
    vi.doMock("../../../src/helpers/setupBattleInfoBar.js", () => ({
      showMessage,
      updateScore
    }));
    vi.doMock("../../../src/helpers/battleEngine.js", () => ({
      handleStatSelection: vi.fn(),
      quitMatch: vi.fn(),
      getScores: () => {
        throw new Error("fail");
      },
      _resetForTest: vi.fn()
    }));
    const { _syncScoreDisplay } = await import("../../../src/helpers/classicBattle.js");
    _syncScoreDisplay();
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    expect(updateScore).not.toHaveBeenCalled();
  });
});
