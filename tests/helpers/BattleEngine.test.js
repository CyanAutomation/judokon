// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { compareStats } from "../../src/helpers/BattleEngine.js";

describe("compareStats", () => {
  it("detects player win", () => {
    expect(compareStats(5, 3)).toEqual({ delta: 2, winner: "player" });
  });

  it("detects opponent win", () => {
    expect(compareStats(3, 5)).toEqual({ delta: -2, winner: "opponent" });
  });

  it("detects tie", () => {
    expect(compareStats(4, 4)).toEqual({ delta: 0, winner: "tie" });
  });
});

describe("BattleEngine robustness scenarios", () => {
  let engine;
  beforeEach(async () => {
    const { BattleEngine } = await import("../../src/helpers/BattleEngine.js");
    engine = new BattleEngine();
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
