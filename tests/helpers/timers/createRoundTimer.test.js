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
});
