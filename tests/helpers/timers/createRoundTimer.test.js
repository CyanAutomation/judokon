import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoundTimer } from "../../../src/helpers/timers/createRoundTimer.js";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

describe("createRoundTimer events", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(() => {
    timers.cleanup();
  });
  it("emits tick and expired", () => {
    const events = [];
    const timer = createRoundTimer({
      starter: (onTick, onExpired) => {
        onTick(2);
        onTick(1);
        onTick(0);
        onExpired();
      }
    });
    timer.on("tick", (r) => events.push(["tick", r]));
    let expired = 0;
    timer.on("expired", () => {
      expired += 1;
    });
    timer.start(2);
    expect(events).toEqual([
      ["tick", 2],
      ["tick", 1],
      ["tick", 0]
    ]);
    expect(expired).toBe(1);
  });

  it("resets drift retries when the timer restarts", async () => {
    const onDriftFail = vi.fn();
    let onDrift;
    const timer = createRoundTimer({
      starter: (onTick, onExpired, total, driftHandler) => {
        onDrift = driftHandler;
      },
      onDriftFail
    });

    timer.start(5);
    expect(typeof onDrift).toBe("function");
    await onDrift(4);
    await onDrift(3);
    await onDrift(2);

    timer.stop();

    timer.start(5);
    await onDrift(4);

    expect(onDriftFail).not.toHaveBeenCalled();
  });

  it("still aborts after exceeding drift retries", async () => {
    const onDriftFail = vi.fn();
    let onDrift;
    const timer = createRoundTimer({
      starter: (onTick, onExpired, total, driftHandler) => {
        onDrift = driftHandler;
      },
      onDriftFail
    });

    timer.start(5);
    expect(typeof onDrift).toBe("function");
    await onDrift(4);
    await onDrift(4);
    await onDrift(4);
    await onDrift(4);

    expect(onDriftFail).toHaveBeenCalledTimes(1);
  });

  it("preserves remaining time when resuming engine starter", () => {
    const starterCalls = [];
    const starter = vi.fn((onTick, onExpired, total) => {
      starterCalls.push({ onTick, onExpired, total });
    });
    const timer = createRoundTimer({ starter });
    const expired = vi.fn();
    timer.on("expired", expired);

    timer.start(5);
    expect(starter).toHaveBeenCalledTimes(1);
    const firstCall = starterCalls[0];
    firstCall.onTick(5);
    firstCall.onTick(4);

    timer.pause();
    timer.resume();

    expect(starter).toHaveBeenCalledTimes(2);
    const secondCall = starterCalls[1];
    expect(secondCall.total).toBe(4);

    secondCall.onTick(4);
    secondCall.onTick(3);
    expect(expired).not.toHaveBeenCalled();

    secondCall.onExpired();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("treats pause and resume as no-ops when remaining time is 0", () => {
    const starterCalls = [];
    const expired = vi.fn();
    const starter = vi.fn((onTick, onExpired, total) => {
      starterCalls.push({ onTick, onExpired, total });
    });
    const timer = createRoundTimer({ starter });
    timer.on("expired", expired);

    timer.start(2);
    expect(starter).toHaveBeenCalledTimes(1);
    const firstCall = starterCalls[0];

    firstCall.onTick(2);
    firstCall.onTick(0);

    timer.pause();
    timer.resume();

    expect(starter).toHaveBeenCalledTimes(1);

    firstCall.onExpired();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("resumes correctly across multiple pause cycles", () => {
    const events = [];
    const timer = createRoundTimer();
    timer.on("tick", (r) => events.push(["tick", r]));
    timer.on("expired", () => events.push(["expired"]));

    timer.start(4);
    expect(events).toEqual([["tick", 4]]);

    timers.advanceTimersByTime(1000);
    expect(events).toEqual([
      ["tick", 4],
      ["tick", 3]
    ]);

    timer.pause();
    timers.advanceTimersByTime(5000);
    expect(events).toEqual([
      ["tick", 4],
      ["tick", 3]
    ]);

    timer.resume();
    timers.runOnlyPendingTimers();
    expect(events).toEqual([
      ["tick", 4],
      ["tick", 3],
      ["tick", 2]
    ]);

    timer.pause();
    timers.advanceTimersByTime(5000);
    expect(events).toEqual([
      ["tick", 4],
      ["tick", 3],
      ["tick", 2]
    ]);

    timer.resume();
    timers.runOnlyPendingTimers();
    expect(events).toEqual([
      ["tick", 4],
      ["tick", 3],
      ["tick", 2],
      ["tick", 1]
    ]);

    timers.runAllTimers();
    expect(events).toEqual([["tick", 4], ["tick", 3], ["tick", 2], ["tick", 1], ["expired"]]);
  });

  it("supports pausing immediately after start before engine ticks", () => {
    const starterCalls = [];
    const starter = vi.fn((onTick, onExpired, total) => {
      starterCalls.push({ onTick, onExpired, total });
    });
    const expired = vi.fn();
    const timer = createRoundTimer({ starter });
    timer.on("expired", expired);

    timer.start(5);
    expect(starter).toHaveBeenCalledTimes(1);

    timer.pause();
    timer.resume();

    expect(starter).toHaveBeenCalledTimes(2);
    const resumedCall = starterCalls[1];
    expect(resumedCall.total).toBe(5);

    resumedCall.onTick(5);
    resumedCall.onTick(4);
    resumedCall.onExpired();

    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("supports pause and resume", () => {
    const events = [];
    const timer = createRoundTimer();
    timer.on("tick", (r) => events.push(["tick", r]));
    timer.on("expired", () => events.push(["expired"]));

    timer.start(3);
    // First tick is emitted synchronously
    expect(events).toEqual([["tick", 3]]);
    timer.pause();
    timers.runAllTimers(); // Should not advance while paused
    expect(events).toEqual([["tick", 3]]);
    timer.resume();
    timers.runAllTimers(); // Should resume and complete
    expect(events).toEqual([["tick", 3], ["tick", 2], ["tick", 1], ["expired"]]);
  });

  it("restarts cleanly after pause then stop", () => {
    const events = [];
    const timer = createRoundTimer();
    timer.on("tick", (r) => events.push(["tick", r]));
    timer.on("expired", () => events.push(["expired"]));

    timer.start(3);
    expect(events).toEqual([["tick", 3]]);

    timer.pause();
    timer.stop();

    timer.start(2);
    expect(events).toEqual([["tick", 3], ["tick", 2]]);

    timers.advanceTimersByTime(1000);
    expect(events).toEqual([["tick", 3], ["tick", 2], ["tick", 1]]);

    timers.runAllTimers();
    expect(events).toEqual([["tick", 3], ["tick", 2], ["tick", 1], ["expired"]]);
  });
});
