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

describe("onEngineCreated", () => {
  it("invokes the listener immediately when an engine already exists", async () => {
    const { timerControllerMock } = mockTimerController();
    const { createBattleEngine, onEngineCreated } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );

    const existingEngine = createBattleEngine();

    const listener = vi.fn();
    const unsubscribe = onEngineCreated(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(existingEngine);

    unsubscribe();

    createBattleEngine({ forceCreate: true });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(timerControllerMock).toHaveBeenCalledTimes(2);
  });
});
