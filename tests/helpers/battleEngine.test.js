// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("BattleEngine timer interactions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("delegates timer control to TimerController", async () => {
    const startRound = vi.fn();
    const startCoolDown = vi.fn();
    const pause = vi.fn();
    const resume = vi.fn();
    const getState = vi.fn().mockReturnValue({ remaining: 0, paused: false });

    vi.doMock("../../src/helpers/TimerController.js", () => ({
      TimerController: vi.fn().mockImplementation(() => ({
        startRound,
        startCoolDown,
        pause,
        resume,
        stop: vi.fn(),
        getState,
        hasActiveTimer: vi.fn()
      }))
    }));

    const {
      startRound: start,
      startCoolDown: cool,
      pauseTimer,
      resumeTimer,
      getTimerState
    } = await import("../../src/helpers/battleEngine.js");

    await start(vi.fn(), vi.fn(), 10);
    expect(startRound).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), 10);

    await cool(vi.fn(), vi.fn(), 5);
    expect(startCoolDown).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), 5);

    pauseTimer();
    expect(pause).toHaveBeenCalled();

    resumeTimer();
    expect(resume).toHaveBeenCalled();

    expect(getTimerState()).toEqual({ remaining: 0, paused: false });
  });
});
