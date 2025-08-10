// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

let timerApi;

beforeEach(() => {
  vi.resetModules();
  vi.doMock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
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
});

describe("pauseTimer/resumeTimer", () => {
  it("resumes countdown from paused remaining time", async () => {
    const { startRound, pauseTimer, resumeTimer, getTimerState, _resetForTest } = await import(
      "../../../src/helpers/battleEngineFacade.js"
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
    expect(getTimerState()).toEqual({ remaining: 3, paused: true });

    timerApi.tick();
    expect(getTimerState()).toEqual({ remaining: 3, paused: true });

    resumeTimer();
    timerApi.tick();
    expect(getTimerState()).toEqual({ remaining: 2, paused: false });
  });
});
