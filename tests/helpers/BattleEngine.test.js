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
});
