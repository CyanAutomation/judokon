// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
const callbacks = [];
let now = 0;
vi.mock("../../src/utils/scheduler.js", () => ({
  onSecondTick: (cb) => {
    callbacks.push(cb);
    return callbacks.length - 1;
  },
  cancel: (id) => {
    delete callbacks[id];
  },
  stop: vi.fn()
}));
vi.spyOn(Date, "now").mockImplementation(() => now);
import { compareStats, createDriftWatcher } from "../../src/helpers/BattleEngine.js";

function tick(ms = 1000) {
  now += ms;
  callbacks.slice().forEach((cb) => cb());
}

describe("compareStats", () => {
  it("detects player win", () => {
    expect(compareStats(5, 3)).toEqual({ delta: 2, winner: "player" });
  });

  it("detects computer win", () => {
    expect(compareStats(3, 5)).toEqual({ delta: -2, winner: "computer" });
  });

  it("detects tie", () => {
    expect(compareStats(4, 4)).toEqual({ delta: 0, winner: "tie" });
  });
});

describe("createDriftWatcher", () => {
  beforeEach(() => {
    callbacks.length = 0;
    now = 0;
  });
  afterEach(() => {
    callbacks.length = 0;
  });

  it("invokes callback when drift exceeds threshold", () => {
    const timer = {
      hasActiveTimer: vi.fn().mockReturnValue(true),
      getState: vi.fn().mockReturnValue({ remaining: 13, paused: false })
    };
    const onDrift = vi.fn();
    const watch = createDriftWatcher(timer);
    watch(10, onDrift);
    tick();
    expect(onDrift).toHaveBeenCalledWith(13);
  });

  it("ignores time spent paused when checking for drift", () => {
    let remaining = 10;
    let paused = false;
    const timer = {
      hasActiveTimer: vi.fn().mockReturnValue(true),
      getState: vi.fn(() => ({ remaining, paused }))
    };
    const onDrift = vi.fn();
    const watch = createDriftWatcher(timer);
    watch(10, onDrift);

    // run for 3 seconds
    remaining = 9;
    tick();
    remaining = 8;
    tick();
    remaining = 7;
    tick();

    // pause for 5 seconds
    paused = true;
    tick(5000);

    // resume and run one more second
    paused = false;
    remaining = 6;
    tick();

    expect(onDrift).not.toHaveBeenCalled();
  });
});

describe("BattleEngine robustness scenarios", () => {
  let engine;
  beforeEach(async () => {
    const { BattleEngine } = await import("../../src/helpers/BattleEngine.js");
    engine = new BattleEngine();
    engine._resetForTest();
  });

  it("pauses and resumes timer on tab inactivity", () => {
    engine.timer.startRound = vi.fn();
    engine.pauseTimer = vi.fn();
    engine.resumeTimer = vi.fn();
    engine.handleTabInactive();
    expect(engine.tabInactive).toBe(true);
    expect(engine.pauseTimer).toHaveBeenCalled();
    engine.handleTabActive();
    expect(engine.tabInactive).toBe(false);
    expect(engine.resumeTimer).toHaveBeenCalled();
  });

  it("handles timer drift", () => {
    engine.stopTimer = vi.fn();
    engine.handleTimerDrift(5);
    expect(engine.lastTimerDrift).toBe(5);
    expect(engine.stopTimer).toHaveBeenCalled();
  });

  it("handles error injection", () => {
    engine.handleError = vi.fn();
    engine.injectError("Injected error");
    expect(engine.lastError).toBe("Injected error");
    expect(engine.handleError).toHaveBeenCalledWith("Injected error");
  });
});

describe("BattleEngine timer pause/resume and drift correction", () => {
  let engine;
  beforeEach(async () => {
    const { BattleEngine } = await import("../../src/helpers/BattleEngine.js");
    engine = new BattleEngine();
    engine._resetForTest();
  });

  it("pauses and resumes the timer", () => {
    engine.timer.pause = vi.fn();
    engine.timer.resume = vi.fn();
    engine.pauseTimer();
    expect(engine.timer.pause).toHaveBeenCalled();
    engine.resumeTimer();
    expect(engine.timer.resume).toHaveBeenCalled();
  });

  it("detects and handles timer drift", () => {
    engine.stopTimer = vi.fn();
    engine.handleTimerDrift(3);
    expect(engine.lastTimerDrift).toBe(3);
    expect(engine.stopTimer).toHaveBeenCalled();
  });
});
