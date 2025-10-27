// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockTimerController(overrides = {}) {
  const timerImpl = {
    startRound: vi.fn(),
    startCoolDown: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    getState: vi.fn().mockReturnValue({ remaining: 0, paused: false }),
    hasActiveTimer: vi.fn(),
    ...overrides
  };
  const timerControllerMock = vi.fn().mockImplementation(() => timerImpl);
  vi.doMock("../../src/helpers/TimerController.js", () => ({
    TimerController: timerControllerMock
  }));
  return { ...timerImpl, timerControllerMock };
}

const originalWindow = global.window;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  if (originalWindow === undefined) {
    delete global.window;
  } else {
    global.window = originalWindow;
  }
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete global.window;
  } else {
    global.window = originalWindow;
  }
});

describe("battleEngineFacade timer interactions", () => {
  it("delegates timer control to TimerController", async () => {
    const { startRound, startCoolDown, pause, resume, getState } = mockTimerController();

    const {
      createBattleEngine,
      startRound: start,
      startCoolDown: cool,
      pauseTimer,
      resumeTimer,
      getTimerState
    } = await import("../../src/helpers/battleEngineFacade.js");

    createBattleEngine();

    await start(vi.fn(), vi.fn(), 10);
    expect(startRound).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      10,
      undefined
    );

    await cool(vi.fn(), vi.fn(), 5);
    expect(startCoolDown).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      5,
      undefined
    );

    pauseTimer();
    expect(pause).toHaveBeenCalled();

    resumeTimer();
    expect(resume).toHaveBeenCalled();

    expect(getTimerState()).toEqual({ remaining: 0, paused: false });
  });
});

describe("createBattleEngine environment isolation", () => {
  it("creates a fresh engine for each call in test environments", async () => {
    const { timerControllerMock } = mockTimerController();
    const { createBattleEngine } = await import("../../src/helpers/battleEngineFacade.js");

    const originalNodeEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    const originalJestWorkerId = process.env.JEST_WORKER_ID;
    const originalBabelEnv = process.env.BABEL_ENV;

    process.env.NODE_ENV = "test";
    process.env.VITEST = "true";
    delete process.env.JEST_WORKER_ID;
    delete process.env.BABEL_ENV;

    try {
      const firstEngine = createBattleEngine();
      const secondEngine = createBattleEngine();

      expect(secondEngine).not.toBe(firstEngine);
      expect(timerControllerMock).toHaveBeenCalledTimes(2);
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      if (originalVitest === undefined) {
        delete process.env.VITEST;
      } else {
        process.env.VITEST = originalVitest;
      }
      if (originalJestWorkerId === undefined) {
        delete process.env.JEST_WORKER_ID;
      } else {
        process.env.JEST_WORKER_ID = originalJestWorkerId;
      }
      if (originalBabelEnv === undefined) {
        delete process.env.BABEL_ENV;
      } else {
        process.env.BABEL_ENV = originalBabelEnv;
      }
    }
  });
});

describe("createBattleEngine browser reuse", () => {
  it("reuses the cached engine unless forceCreate is requested", async () => {
    const { timerControllerMock } = mockTimerController();
    const fakeWindow = {};
    global.window = fakeWindow;

    const { createBattleEngine } = await import("../../src/helpers/battleEngineFacade.js");

    const firstEngine = createBattleEngine();
    expect(timerControllerMock).toHaveBeenCalledTimes(1);

    const reusedEngine = createBattleEngine();
    expect(reusedEngine).toBe(firstEngine);
    expect(timerControllerMock).toHaveBeenCalledTimes(1);

    const forcedEngine = createBattleEngine({ forceCreate: true });
    expect(forcedEngine).not.toBe(firstEngine);
    expect(timerControllerMock).toHaveBeenCalledTimes(2);
  });
});
