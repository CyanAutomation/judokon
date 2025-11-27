// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
let timerApi = null;
const { mockCreateCountdownTimer } = vi.hoisted(() => ({
  mockCreateCountdownTimer: (duration, { onTick }) => {
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
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createCountdownTimer: mockCreateCountdownTimer
  };
});

beforeEach(() => {
  vi.resetModules();
  timerApi = null;
});

describe("pauseTimer/resumeTimer", () => {
  it("resumes countdown from paused remaining time", async () => {
    const { createBattleEngine, startRound, pauseTimer, resumeTimer, getTimerState } = await import(
      "../../../src/helpers/battleEngineFacade.js"
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
    expect(getTimerState()).toMatchObject({ remaining: 3, paused: true });

    timerApi.tick();
    expect(getTimerState()).toMatchObject({ remaining: 3, paused: true });

    resumeTimer();
    timerApi.tick();
    expect(getTimerState()).toMatchObject({ remaining: 2, paused: false });
  });
});
