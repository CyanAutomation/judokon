// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compareStats,
  determineOutcome,
  applyOutcome,
  BattleEngine,
  TIMER_CATEGORY
} from "../../src/helpers/index.js";
import {
  CLASSIC_BATTLE_POINTS_TO_WIN,
  CLASSIC_BATTLE_MAX_ROUNDS
} from "../../src/helpers/constants.js";
import {
  startRoundTimer,
  startCoolDownTimer,
  pauseTimer as pauseEngineTimer,
  resumeTimer as resumeEngineTimer,
  stopTimer,
  handleTabInactive,
  handleTabActive,
  handleTimerDrift
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
});

describe("BattleEngine handleTimerDrift restart paths", () => {
  let engine;
  let startRoundMock;
  let startCoolDownMock;

  beforeEach(() => {
    engine = new BattleEngine();
    startRoundMock = vi
      .spyOn(engine.timer, "startRound")
      .mockImplementation(async function (onTick, onExpired, duration) {
        this.currentTimer = { stop: vi.fn(), pause: vi.fn(), resume: vi.fn() };
        this.remaining = duration;
        this.paused = false;
        this.onTickCb = onTick;
        this.onExpiredCb = onExpired;
        this.activeCategory = TIMER_CATEGORY.ROUND;
        this.pauseOnHiddenSetting = true;
      });
    startCoolDownMock = vi
      .spyOn(engine.timer, "startCoolDown")
      .mockImplementation(async function (onTick, onExpired, duration) {
        this.currentTimer = { stop: vi.fn(), pause: vi.fn(), resume: vi.fn() };
        this.remaining = duration;
        this.paused = false;
        this.onTickCb = onTick;
        this.onExpiredCb = onExpired;
        this.activeCategory = TIMER_CATEGORY.COOLDOWN;
        this.pauseOnHiddenSetting = true;
      });
  });

  it("restarts the round timer after drift and keeps round behaviour", async () => {
    const tickSpy = vi.fn();
    const expiredSpy = vi.fn();
    const timerTickSpy = vi.fn();
    engine.on("timerTick", timerTickSpy);

    await startRoundTimer(engine, tickSpy, expiredSpy, 10, (r) => engine.handleTimerDrift(r));
    expect(startRoundMock).toHaveBeenCalledTimes(1);
    expect(engine.timer.getActiveCategory()).toBe(TIMER_CATEGORY.ROUND);

    const firstTickHandler = engine.timer.onTickCb;
    const firstExpiredHandler = engine.timer.onExpiredCb;
    engine.timer.onTickCb(9);
    expect(timerTickSpy).toHaveBeenLastCalledWith({ remaining: 9, phase: "round" });
    timerTickSpy.mockClear();

    const stopSpy = vi.spyOn(engine.timer.currentTimer, "stop");
    await engine.handleTimerDrift(8);
    expect(stopSpy).toHaveBeenCalled();
    expect(engine.lastTimerDrift).toBe(8);
    expect(startRoundMock).toHaveBeenCalledTimes(2);
    expect(startCoolDownMock).not.toHaveBeenCalled();
    expect(engine.timer.onTickCb).toBe(firstTickHandler);
    expect(engine.timer.onExpiredCb).toBe(firstExpiredHandler);
    expect(engine.timer.getState().pauseOnHidden).toBe(true);

    engine.timer.onTickCb(7);
    expect(timerTickSpy).toHaveBeenLastCalledWith({ remaining: 7, phase: "round" });
  });

  it("restarts the cooldown timer after drift and keeps cooldown behaviour", async () => {
    const tickSpy = vi.fn();
    const expiredSpy = vi.fn();
    const timerTickSpy = vi.fn();
    engine.on("timerTick", timerTickSpy);

    await startCoolDownTimer(engine, tickSpy, expiredSpy, 5, (r) => engine.handleTimerDrift(r));
    expect(startCoolDownMock).toHaveBeenCalledTimes(1);
    expect(engine.timer.getActiveCategory()).toBe(TIMER_CATEGORY.COOLDOWN);

    const firstTickHandler = engine.timer.onTickCb;
    const firstExpiredHandler = engine.timer.onExpiredCb;
    engine.timer.onTickCb(4);
    expect(timerTickSpy).toHaveBeenLastCalledWith({ remaining: 4, phase: "cooldown" });
    timerTickSpy.mockClear();

    const stopSpy = vi.spyOn(engine.timer.currentTimer, "stop");
    await engine.handleTimerDrift(3);
    expect(stopSpy).toHaveBeenCalled();
    expect(engine.lastTimerDrift).toBe(3);
    expect(startCoolDownMock).toHaveBeenCalledTimes(2);
    expect(startRoundMock).not.toHaveBeenCalled();
    expect(engine.timer.onTickCb).toBe(firstTickHandler);
    expect(engine.timer.onExpiredCb).toBe(firstExpiredHandler);
    expect(engine.timer.getState().pauseOnHidden).toBe(true);

    engine.timer.onTickCb(2);
    expect(timerTickSpy).toHaveBeenLastCalledWith({ remaining: 2, phase: "cooldown" });
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

describe("engineTimer event emissions", () => {
  let engine;

  beforeEach(() => {
    engine = new BattleEngine();
  });

  it("startRoundTimer emits roundStarted event with incremented round number", async () => {
    const roundStartedSpy = vi.fn();
    engine.on("roundStarted", roundStartedSpy);

    engine.timer.startRound = vi.fn(() => {
      return Promise.resolve();
    });

    engine.roundsPlayed = 2; // Already played 2 rounds
    await startRoundTimer(engine, undefined, undefined, 10);

    expect(roundStartedSpy).toHaveBeenCalledWith({ round: 3 });
    expect(roundStartedSpy).toHaveBeenCalledTimes(1);
  });

  it("startRoundTimer emits timerDriftDetected event when onDrift callback is triggered", async () => {
    const timerDriftDetectedSpy = vi.fn();
    engine.on("timerDriftDetected", timerDriftDetectedSpy);

    let driftHandler;
    engine.timer.startRound = vi.fn((tick, expired, duration, onDrift) => {
      driftHandler = onDrift;
      return Promise.resolve();
    });

    const onDriftHandler = vi.fn();
    await startRoundTimer(engine, undefined, undefined, 10, onDriftHandler);

    // Simulate drift detection
    driftHandler(5);

    expect(timerDriftDetectedSpy).toHaveBeenCalledWith({ phase: "round", remaining: 5 });
    expect(onDriftHandler).toHaveBeenCalledWith(5);
  });

  it("startCoolDownTimer emits timerDriftDetected event with cooldown phase", async () => {
    const timerDriftDetectedSpy = vi.fn();
    engine.on("timerDriftDetected", timerDriftDetectedSpy);

    let driftHandler;
    engine.timer.startCoolDown = vi.fn((tick, expired, duration, onDrift) => {
      driftHandler = onDrift;
      return Promise.resolve();
    });

    const onDriftHandler = vi.fn();
    await startCoolDownTimer(engine, undefined, undefined, 5, onDriftHandler);

    // Simulate drift detection
    driftHandler(2);

    expect(timerDriftDetectedSpy).toHaveBeenCalledWith({ phase: "cooldown", remaining: 2 });
    expect(onDriftHandler).toHaveBeenCalledWith(2);
  });

  it("pauseTimer emits timerPaused event", () => {
    const timerPausedSpy = vi.fn();
    engine.on("timerPaused", timerPausedSpy);
    engine.timer.pause = vi.fn();

    pauseEngineTimer(engine);

    expect(timerPausedSpy).toHaveBeenCalledWith({});
    expect(timerPausedSpy).toHaveBeenCalledTimes(1);
    expect(engine.timer.pause).toHaveBeenCalled();
  });

  it("resumeTimer emits timerResumed event", () => {
    const timerResumedSpy = vi.fn();
    engine.on("timerResumed", timerResumedSpy);
    engine.timer.resume = vi.fn();

    resumeEngineTimer(engine);

    expect(timerResumedSpy).toHaveBeenCalledWith({});
    expect(timerResumedSpy).toHaveBeenCalledTimes(1);
    expect(engine.timer.resume).toHaveBeenCalled();
  });

  it("stopTimer emits timerStopped event", () => {
    const timerStoppedSpy = vi.fn();
    engine.on("timerStopped", timerStoppedSpy);
    engine.timer.stop = vi.fn();

    stopTimer(engine);

    expect(timerStoppedSpy).toHaveBeenCalledWith({});
    expect(timerStoppedSpy).toHaveBeenCalledTimes(1);
    expect(engine.timer.stop).toHaveBeenCalled();
  });

  it("handleTabInactive emits tabInactive event and pauses timer", () => {
    const tabInactiveSpy = vi.fn();
    const timerPausedSpy = vi.fn();
    engine.on("tabInactive", tabInactiveSpy);
    engine.on("timerPaused", timerPausedSpy);
    engine.timer.pause = vi.fn();

    handleTabInactive(engine);

    expect(tabInactiveSpy).toHaveBeenCalledWith({});
    expect(tabInactiveSpy).toHaveBeenCalledTimes(1);
    expect(timerPausedSpy).toHaveBeenCalledTimes(1);
    expect(engine.tabInactive).toBe(true);
    expect(engine.timer.pause).toHaveBeenCalled();
  });

  it("handleTabActive emits tabActive event and resumes timer when tab becomes active", () => {
    const tabActiveSpy = vi.fn();
    const timerResumedSpy = vi.fn();
    engine.on("tabActive", tabActiveSpy);
    engine.on("timerResumed", timerResumedSpy);
    engine.timer.resume = vi.fn();
    engine.tabInactive = true;

    handleTabActive(engine);

    expect(tabActiveSpy).toHaveBeenCalledWith({});
    expect(tabActiveSpy).toHaveBeenCalledTimes(1);
    expect(timerResumedSpy).toHaveBeenCalledTimes(1);
    expect(engine.tabInactive).toBe(false);
    expect(engine.timer.resume).toHaveBeenCalled();
  });

  it("handleTabActive does not emit tabActive event if already active", () => {
    const tabActiveSpy = vi.fn();
    engine.on("tabActive", tabActiveSpy);
    engine.timer.resume = vi.fn();
    engine.tabInactive = false;

    handleTabActive(engine);

    expect(tabActiveSpy).not.toHaveBeenCalled();
    expect(engine.timer.resume).not.toHaveBeenCalled();
  });

  it("handleTimerDrift emits timerDriftRecorded event with drift amount", () => {
    const timerDriftRecordedSpy = vi.fn();
    engine.on("timerDriftRecorded", timerDriftRecordedSpy);
    engine.timer.stop = vi.fn();

    handleTimerDrift(engine, 7);

    expect(timerDriftRecordedSpy).toHaveBeenCalledWith({ driftAmount: 7 });
    expect(timerDriftRecordedSpy).toHaveBeenCalledTimes(1);
    expect(engine.lastTimerDrift).toBe(7);
    expect(engine.timer.stop).toHaveBeenCalled();
  });

  it("handleTimerDrift also emits timerStopped event via stopTimer", () => {
    const timerDriftRecordedSpy = vi.fn();
    const timerStoppedSpy = vi.fn();
    engine.on("timerDriftRecorded", timerDriftRecordedSpy);
    engine.on("timerStopped", timerStoppedSpy);
    engine.timer.stop = vi.fn();

    handleTimerDrift(engine, 4);

    expect(timerDriftRecordedSpy).toHaveBeenCalledWith({ driftAmount: 4 });
    expect(timerStoppedSpy).toHaveBeenCalledWith({});
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
