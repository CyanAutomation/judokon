import { describe, it, expect, vi, beforeEach } from "vitest";

const createDeterministicScheduler = () => {
  let nextId = 1;
  const tasks = new Map();

  const schedule = (fn, delay = 0) => {
    const id = nextId++;
    tasks.set(id, { fn, delay });
    return id;
  };

  const clear = (id) => {
    tasks.delete(id);
  };

  const runNextTask = () => {
    if (tasks.size === 0) {
      return false;
    }

    const [chosenId, chosenTask] = Array.from(tasks.entries()).reduce(
      ([bestId, bestTask], [id, task]) => {
        if (
          task.delay < bestTask.delay ||
          (task.delay === bestTask.delay && id < bestId)
        ) {
          return [id, task];
        }
        return [bestId, bestTask];
      }
    );

    tasks.delete(chosenId);
    chosenTask.fn();
    return true;
  };

  return {
    setTimeout: vi.fn(schedule),
    clearTimeout: vi.fn(clear),
    runNext: () => runNextTask(),
    runAll: () => {
      while (runNextTask()) {
        // Keep draining until all scheduled callbacks run.
      }
    },
    peekDelays: () => Array.from(tasks.values()).map((task) => task.delay)
  };
};

const promptTrackerMocks = vi.hoisted(() => ({
  getOpponentPromptTimestamp: vi.fn(() => 0),
  getOpponentPromptMinDuration: vi.fn(() => 0)
}));

vi.mock("../../src/helpers/classicBattle/opponentPromptTracker.js", () => promptTrackerMocks);

const {
  getOpponentPromptTimestamp: mockGetOpponentPromptTimestamp,
  getOpponentPromptMinDuration: mockGetOpponentPromptMinDuration
} = promptTrackerMocks;

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn(),
  updateTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

import {
  createPromptDelayController,
  attachCooldownRenderer
} from "../../src/helpers/CooldownRenderer.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";
import * as snackbar from "../../src/helpers/showSnackbar.js";
import * as scoreboard from "../../src/helpers/setupScoreboard.js";

describe("createPromptDelayController", () => {
  let currentNow;
  const now = () => currentNow;

  beforeEach(() => {
    currentNow = 0;
    mockGetOpponentPromptTimestamp.mockReturnValue(0);
    mockGetOpponentPromptMinDuration.mockReturnValue(0);
    vi.clearAllMocks();
  });

  it("delays queued tick until opponent prompt duration elapses", () => {
    const scheduler = createDeterministicScheduler();
    currentNow = 1000;
    mockGetOpponentPromptTimestamp.mockReturnValue(800);
    mockGetOpponentPromptMinDuration.mockReturnValue(500);

    const controller = createPromptDelayController({
      now,
      setTimeoutFn: scheduler.setTimeout,
      clearTimeoutFn: scheduler.clearTimeout
    });
    const onReady = vi.fn();

    expect(controller.shouldDefer()).toBe(true);

    controller.queueTick(3, {}, onReady);

    expect(onReady).not.toHaveBeenCalled();
    expect(scheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 300);

    currentNow = 1300;
    scheduler.runNext();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(3, { suppressEvents: false });
    expect(controller.shouldDefer()).toBe(false);
  });

  it("polls for opponent prompt before delivering tick when waiting is enabled", () => {
    const scheduler = createDeterministicScheduler();
    currentNow = 0;
    mockGetOpponentPromptTimestamp.mockReturnValue(0);

    const controller = createPromptDelayController({
      waitForOpponentPrompt: true,
      promptPollIntervalMs: 25,
      maxPromptWaitMs: 100,
      now,
      setTimeoutFn: scheduler.setTimeout,
      clearTimeoutFn: scheduler.clearTimeout
    });
    const onReady = vi.fn();

    controller.queueTick(9, {}, onReady);

    expect(controller.shouldDefer()).toBe(true);
    expect(onReady).not.toHaveBeenCalled();
    expect(scheduler.peekDelays()).toEqual([25]);

    currentNow = 25;
    mockGetOpponentPromptTimestamp.mockReturnValue(25);

    scheduler.runNext();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(9, { suppressEvents: false });
    expect(controller.shouldDefer()).toBe(false);
  });

  it("resumes queued countdown after exceeding max prompt wait", () => {
    const scheduler = createDeterministicScheduler();
    currentNow = 0;
    mockGetOpponentPromptTimestamp.mockReturnValue(0);

    const controller = createPromptDelayController({
      waitForOpponentPrompt: true,
      promptPollIntervalMs: 40,
      maxPromptWaitMs: 120,
      now,
      setTimeoutFn: scheduler.setTimeout,
      clearTimeoutFn: scheduler.clearTimeout
    });
    const onReady = vi.fn();

    controller.queueTick(7, {}, onReady);

    currentNow = 40;
    scheduler.runNext();
    expect(onReady).not.toHaveBeenCalled();
    expect(scheduler.peekDelays()).toEqual([40]);

    currentNow = 80;
    scheduler.runNext();
    expect(onReady).not.toHaveBeenCalled();
    expect(scheduler.peekDelays()).toEqual([40]);

    currentNow = 120;
    scheduler.runNext();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(7, { suppressEvents: false });
    expect(scheduler.peekDelays()).toEqual([]);

    controller.queueTick(5, {}, onReady);

    currentNow = 160;
    scheduler.runNext();
    expect(onReady).toHaveBeenCalledTimes(1);

    currentNow = 200;
    scheduler.runNext();
    expect(onReady).toHaveBeenCalledTimes(1);

    currentNow = 240;
    scheduler.runNext();
    expect(onReady).toHaveBeenCalledTimes(2);
    expect(onReady).toHaveBeenLastCalledWith(5, { suppressEvents: false });
  });

  it("clears pending prompt delay and prevents queued callback", () => {
    const scheduler = createDeterministicScheduler();
    currentNow = 500;
    mockGetOpponentPromptTimestamp.mockReturnValue(200);
    mockGetOpponentPromptMinDuration.mockReturnValue(900);

    const controller = createPromptDelayController({
      now,
      setTimeoutFn: scheduler.setTimeout,
      clearTimeoutFn: scheduler.clearTimeout
    });
    const onReady = vi.fn();

    controller.queueTick(6, {}, onReady);
    controller.clear();

    currentNow = 1100;
    scheduler.runAll();

    expect(onReady).not.toHaveBeenCalled();
    expect(controller.shouldDefer()).toBe(false);
  });

  it("flushes queued tick immediately when prompt duration is non-positive", () => {
    currentNow = 1000;
    mockGetOpponentPromptTimestamp.mockReturnValue(1000);
    mockGetOpponentPromptMinDuration.mockReturnValue(-50);

    const controller = createPromptDelayController({ now });
    const onReady = vi.fn();

    controller.queueTick(4, {}, onReady);

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(4, { suppressEvents: false });
  });

  it("handles timer functions that throw without propagating errors", () => {
    const failingSetTimeout = vi.fn(() => {
      throw new Error("boom");
    });

    const controller = createPromptDelayController({
      now,
      waitForOpponentPrompt: true,
      maxPromptWaitMs: 100,
      setTimeoutFn: failingSetTimeout,
      clearTimeoutFn: () => {}
    });
    const onReady = vi.fn();

    expect(() => controller.queueTick(2, {}, onReady)).not.toThrow();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(2, { suppressEvents: false });
    expect(failingSetTimeout).toHaveBeenCalled();
  });

  it("clears timers safely even when clearTimeout throws", () => {
    const scheduler = createDeterministicScheduler();
    currentNow = 200;
    mockGetOpponentPromptTimestamp.mockReturnValue(100);
    mockGetOpponentPromptMinDuration.mockReturnValue(400);

    const failingClearTimeout = vi.fn(() => {
      throw new Error("stop");
    });

    const controller = createPromptDelayController({
      now,
      setTimeoutFn: scheduler.setTimeout,
      clearTimeoutFn: failingClearTimeout
    });
    const onReady = vi.fn();

    controller.queueTick(8, {}, onReady);

    expect(() => controller.clear()).not.toThrow();
    scheduler.runAll();

    expect(onReady).not.toHaveBeenCalled();
    expect(failingClearTimeout).toHaveBeenCalled();
  });
});

describe("attachCooldownRenderer", () => {
  let timer;

  beforeEach(() => {
    mockGetOpponentPromptTimestamp.mockReturnValue(0);
    mockGetOpponentPromptMinDuration.mockReturnValue(0);
    timer = {
      handlers: { tick: [], expired: [] },
      on(event, fn) {
        this.handlers[event].push(fn);
      },
      off(event, fn) {
        this.handlers[event] = this.handlers[event].filter((h) => h !== fn);
      },
      emit(event, value) {
        for (const fn of this.handlers[event]) {
          fn(value);
        }
      }
    };
    vi.clearAllMocks();
  });

  it("renders initial countdown and emits events on first tick", () => {
    const detach = attachCooldownRenderer(timer, 5);

    expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 5s");
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(5);
    expect(emitBattleEvent).not.toHaveBeenCalled();

    mockGetOpponentPromptTimestamp.mockReturnValue(100);

    timer.emit("tick", 5);

    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundCountdownStarted");
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundCountdownTick", { remaining: 5 });
    detach();
  });

  it("updates snackbar and scoreboard on tick changes and expiration", () => {
    attachCooldownRenderer(timer);

    mockGetOpponentPromptTimestamp.mockReturnValue(100);

    timer.emit("tick", 3);
    expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 3s");
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(3);

    timer.emit("tick", 1);
    expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(1);

    timer.emit("expired");
    expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 0s");
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(0);
  });

  it("renders initial countdown immediately when maxPromptWaitMs is zero", () => {
    const detach = attachCooldownRenderer(timer, 4, {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: 0
    });

    expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 4s");
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(4);
    expect(emitBattleEvent).not.toHaveBeenCalled();

    detach();
  });
});
