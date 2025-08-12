// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { compareStats, createDriftWatcher } from "../../src/helpers/BattleEngine.js";

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
  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes callback when drift exceeds threshold", () => {
    vi.useFakeTimers();
    const timer = {
      hasActiveTimer: vi.fn().mockReturnValue(true),
      getState: vi.fn().mockReturnValue({ remaining: 13, paused: false })
    };
    const onDrift = vi.fn();
    const watch = createDriftWatcher(timer);
    watch(10, onDrift);
    vi.advanceTimersByTime(1000);
    expect(onDrift).toHaveBeenCalledWith(13);
  });

  it("ignores time spent paused when checking for drift", () => {
    vi.useFakeTimers();
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
    vi.advanceTimersByTime(1000);
    remaining = 8;
    vi.advanceTimersByTime(1000);
    remaining = 7;
    vi.advanceTimersByTime(1000);

    // pause for 5 seconds
    paused = true;
    vi.advanceTimersByTime(5000);

    // resume and run one more second
    paused = false;
    remaining = 6;
    vi.advanceTimersByTime(1000);

    expect(onDrift).not.toHaveBeenCalled();
  });
});
