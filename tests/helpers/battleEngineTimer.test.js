// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockGameTimers, mockGetDefaultTimer, mockCreateCountdownTimer } = vi.hoisted(() => ({
  mockGameTimers: [{ id: 1, value: 42, default: true, category: "roundTimer" }],
  mockGetDefaultTimer: vi.fn().mockResolvedValue(42),
  mockCreateCountdownTimer: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn()
  }))
}));

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/data/gameTimers.js", () => ({ default: mockGameTimers }));

vi.mock("../../src/helpers/timerUtils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDefaultTimer: mockGetDefaultTimer,
    createCountdownTimer: mockCreateCountdownTimer
  };
});

beforeEach(() => {
  vi.resetModules();
  mockGameTimers.length = 0;
  mockGameTimers.push({ id: 1, value: 42, default: true, category: "roundTimer" });
});

describe("timer defaults", () => {
  it("resolves default timer value from module", async () => {
    const { getDefaultTimer, _resetForTest } = await import("../../src/helpers/timerUtils.js");
    _resetForTest();
    const val = await getDefaultTimer("roundTimer");
    expect(val).toBe(42);
  });

  describe("battleEngine uses default duration", () => {
    let createBattleEngine;
    let startRound;
    let startCoolDown;
    let timerUtils;

    beforeEach(async () => {
      mockGetDefaultTimer.mockClear().mockResolvedValue(42);
      mockCreateCountdownTimer.mockClear().mockImplementation(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn()
      }));

      ({ createBattleEngine, startRound, startCoolDown } = await import(
        "../../src/helpers/battleEngineFacade.js"
      ));
      timerUtils = await import("../../src/helpers/timerUtils.js");
      createBattleEngine();
    });

    it("startRound uses default duration when none provided", async () => {
      await startRound(vi.fn(), vi.fn());
      expect(timerUtils.createCountdownTimer).toHaveBeenCalledWith(42, expect.any(Object));
      expect(timerUtils.createCountdownTimer.mock.results[0].value.start).toHaveBeenCalled();
    });

    it("startCoolDown uses default duration when none provided", async () => {
      await startCoolDown(vi.fn(), vi.fn());
      expect(timerUtils.createCountdownTimer).toHaveBeenCalledWith(42, expect.any(Object));
      expect(timerUtils.createCountdownTimer.mock.results[0].value.start).toHaveBeenCalled();
    });
  });
});

describe("pause and resume timer", () => {
  it("pauses countdown and resumes from remaining time", async () => {
    let timerApi;
    vi.doMock("../../src/helpers/timerUtils.js", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        createCountdownTimer: (duration, { onTick }) => {
          let remaining = duration;
          let paused = false;
          timerApi = {
            start() {},
            stop() {},
            pause() {
              paused = true;
            },
            resume() {
              paused = false;
            },
            tick() {
              if (paused) return;
              remaining -= 1;
              onTick(remaining);
            }
          };
          return timerApi;
        }
      };
    });

    const { createBattleEngine, startRound, pauseTimer, resumeTimer, getTimerState } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    createBattleEngine();
    await startRound(
      () => {},
      () => {},
      5
    );
    timerApi.tick();
    timerApi.tick();
    pauseTimer();
    let state = getTimerState();
    expect(state.remaining).toBe(3);
    expect(state.paused).toBe(true);
    timerApi.tick();
    state = getTimerState();
    expect(state.remaining).toBe(3);
    resumeTimer();
    timerApi.tick();
    state = getTimerState();
    expect(state.remaining).toBe(2);
    expect(state.paused).toBe(false);
  });
});
