// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compareStats,
  determineOutcome,
  applyOutcome,
  BattleEngine
} from "../../src/helpers/index.js";
import {
  CLASSIC_BATTLE_POINTS_TO_WIN,
  CLASSIC_BATTLE_MAX_ROUNDS
} from "../../src/helpers/constants.js";
import {
  startRoundTimer,
  pauseTimer as pauseEngineTimer,
  resumeTimer as resumeEngineTimer
} from "../../src/helpers/battle/engineTimer.js";
import { SimpleEmitter } from "../../src/helpers/events/SimpleEmitter.js";

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
  beforeEach(() => {
    engine = new BattleEngine();
  });

  it("pauses and resumes timer on tab inactivity", () => {
    engine.timer.pause = vi.fn();
    engine.timer.resume = vi.fn();
    engine.handleTabInactive();
    expect(engine.tabInactive).toBe(true);
    expect(engine.timer.pause).toHaveBeenCalled();
    engine.handleTabActive();
    expect(engine.tabInactive).toBe(false);
    expect(engine.timer.resume).toHaveBeenCalled();
  });

  it("handles timer drift", () => {
    engine.timer.stop = vi.fn();
    engine.handleTimerDrift(5);
    expect(engine.lastTimerDrift).toBe(5);
    expect(engine.timer.stop).toHaveBeenCalled();
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
  beforeEach(() => {
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
    engine.timer.stop = vi.fn();
    engine.handleTimerDrift(3);
    expect(engine.lastTimerDrift).toBe(3);
    expect(engine.timer.stop).toHaveBeenCalled();
  });
});

describe("helpers index contract: compareStats/determineOutcome/applyOutcome coordinate BattleEngine scoring", () => {
  it("compares stats, derives round outcomes, and mutates engine scores using default classic battle settings", () => {
    const engine = new BattleEngine();

    const statsSummary = compareStats(12, 8);
    expect(statsSummary).toEqual({ delta: 4, winner: "player" });

    const roundOutcome = determineOutcome(12, 8);
    expect(roundOutcome).toEqual({ delta: 4, outcome: "winPlayer" });

    applyOutcome(engine, roundOutcome);
    expect(engine.playerScore).toBe(1);
    expect(engine.opponentScore).toBe(0);

    expect(engine.pointsToWin).toBe(CLASSIC_BATTLE_POINTS_TO_WIN);
    expect(engine.maxRounds).toBe(CLASSIC_BATTLE_MAX_ROUNDS);

    expect(compareStats).toHaveLength(2);
    expect(determineOutcome).toHaveLength(2);
    expect(applyOutcome).toHaveLength(2);
  });
});

describe("engineTimer helpers", () => {
  it("starts round and emits ticks", async () => {
    const engine = new BattleEngine();
    engine.timer.startRound = vi.fn((tick, expired) => {
      tick(3);
      return expired();
    });
    const onTick = vi.fn();
    const onExpired = vi.fn();
    await startRoundTimer(engine, onTick, onExpired);
    expect(engine.timer.startRound).toHaveBeenCalled();
    expect(onTick).toHaveBeenCalledWith(3);
    expect(onExpired).toHaveBeenCalled();
  });

  it("pauses and resumes via helpers", () => {
    const engine = new BattleEngine();
    engine.timer.pause = vi.fn();
    engine.timer.resume = vi.fn();
    pauseEngineTimer(engine);
    resumeEngineTimer(engine);
    expect(engine.timer.pause).toHaveBeenCalled();
    expect(engine.timer.resume).toHaveBeenCalled();
  });
});

describe("SimpleEmitter", () => {
  it("registers and removes handlers", () => {
    const emitter = new SimpleEmitter();
    const handler = vi.fn();
    emitter.on("test", handler);
    emitter.emit("test", 1);
    emitter.off("test", handler);
    emitter.emit("test", 2);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
