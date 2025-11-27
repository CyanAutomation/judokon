import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockTimerControllerFn } = vi.hoisted(() => ({
  mockTimerControllerFn: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/TimerController.js", () => ({
  TimerController: mockTimerControllerFn
}));

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
  mockTimerControllerFn.mockImplementation(() => timerImpl);
  return { ...timerImpl, timerControllerMock: mockTimerControllerFn };
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
