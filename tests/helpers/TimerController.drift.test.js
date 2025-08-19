import { describe, it, expect, vi } from "vitest";
import { TimerController } from "../../src/helpers/TimerController.js";

describe("TimerController drift detection", () => {
  it("invokes onDrift when remaining drifts beyond threshold", async () => {
    vi.useFakeTimers();
    const callbacks = new Map();
    let nextId = 0;
    const onSecondTick = (cb) => {
      const id = ++nextId;
      callbacks.set(id, cb);
      return id;
    };
    const cancel = (id) => callbacks.delete(id);
    const tc = new TimerController({ onSecondTick, cancel });
    const onDrift = vi.fn();
    await tc.startRound(
      () => {},
      () => {},
      10,
      onDrift
    );
    // first tick normal
    vi.advanceTimersByTime(1000);
    callbacks.get(1)?.(); // timer tick
    callbacks.get(2)?.(); // drift checker
    // simulate missing ticks for 3 seconds
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(1000);
      callbacks.get(2)?.();
    }
    expect(onDrift).toHaveBeenCalledWith(9);
    vi.useRealTimers();
  });
});
