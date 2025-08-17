// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import defaultSettings from "../../src/data/settings.json" with { type: "json" };

const mockTimers = [{ id: 1, value: 42, default: true, category: "roundTimer" }];

beforeEach(() => {
  vi.resetModules();
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue(mockTimers),
    importJsonModule: vi.fn().mockResolvedValue(defaultSettings)
  }));
});

describe("timer defaults", () => {
  it("resolves default timer value from gameTimers.json", async () => {
    const { getDefaultTimer, _resetForTest } = await import("../../src/helpers/timerUtils.js");
    _resetForTest();
    const val = await getDefaultTimer("roundTimer");
    expect(val).toBe(42);
  });

  it("startRound uses default duration when none provided", async () => {
    vi.doMock("../../src/helpers/timerUtils.js", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        getDefaultTimer: vi.fn().mockResolvedValue(42),
        createCountdownTimer: vi.fn(() => ({
          start: vi.fn(),
          stop: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn()
        }))
      };
    });

    const { startRound, _resetForTest } = await import("../../src/helpers/battleEngineFacade.js");
    const timerUtils = await import("../../src/helpers/timerUtils.js");
    _resetForTest();

    await startRound(vi.fn(), vi.fn());

    expect(timerUtils.createCountdownTimer).toHaveBeenCalledWith(42, expect.any(Object));
    expect(timerUtils.createCountdownTimer.mock.results[0].value.start).toHaveBeenCalled();
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

    const { startRound, pauseTimer, resumeTimer, getTimerState, _resetForTest } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    _resetForTest();
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
