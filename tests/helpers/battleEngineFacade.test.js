// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockTimerController(overrides = {}) {
  const timerImpl = {
    startRound: vi.fn(),
    startCoolDown: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    getState: vi.fn().mockReturnValue({
      remaining: 0,
      paused: false,
      category: null,
      pauseOnHidden: false
    }),
    hasActiveTimer: vi.fn(),
    ...overrides
  };
  const timerControllerMock = vi.fn().mockImplementation(() => timerImpl);
  vi.doMock("../../src/helpers/TimerController.js", () => ({
    TimerController: timerControllerMock
  }));
  return { ...timerImpl, timerControllerMock };
}

/**
 * Temporarily overrides process environment variables for the duration of a callback.
 * @param {Record<string, string | undefined>} overrides Environment variable overrides. Use `undefined` to delete variables.
 * @param {Function} callback Function to execute with the overridden environment.
 * @returns {*} The result of the callback, with proper cleanup for both sync and async functions.
 * @pseudocode
 * 1. Capture the original values for each override key.
 * 2. Apply each override, deleting variables when the value is `undefined`.
 * 3. Execute the callback and track whether it returns a promise.
 * 4. Restore the original values after the callback completes or throws.
 */
function withProcessEnv(overrides, callback) {
  const originalValues = {};
  const entries = Object.entries(overrides);

  for (const [key] of entries) {
    originalValues[key] = process.env[key];
  }

  for (const [key, value] of entries) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key] of entries) {
      const originalValue = originalValues[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  };

  try {
    const result = callback();

    if (result && typeof result.then === "function") {
      return result.finally(restore);
    }

    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
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

    expect(getTimerState()).toMatchObject({ remaining: 0, paused: false });
    expect(getState).toHaveBeenCalled();
  });
});

describe("createBattleEngine environment isolation", () => {
  it("creates a fresh engine for each call in test environments", async () => {
    const { timerControllerMock } = mockTimerController();
    const { createBattleEngine } = await import("../../src/helpers/battleEngineFacade.js");

    withProcessEnv(
      {
        NODE_ENV: "test",
        VITEST: "true",
        JEST_WORKER_ID: undefined,
        BABEL_ENV: undefined
      },
      () => {
        const firstEngine = createBattleEngine();
        const secondEngine = createBattleEngine();

        expect(secondEngine).not.toBe(firstEngine);
        expect(timerControllerMock).toHaveBeenCalledTimes(2);
      }
    );
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
