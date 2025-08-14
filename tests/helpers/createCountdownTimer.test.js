// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
const callbacks = [];
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
import { createCountdownTimer } from "../../src/helpers/timerUtils.js";

function tick() {
  callbacks.slice().forEach((cb) => cb());
}

/**
 * These tests cover the small countdown timer utility used by the battle engine
 * and various pages. They focus on verifying the tick callback, pause/resume
 * logic and final expiration behaviour.
 */

describe("createCountdownTimer", () => {
  it("updates remaining time on each tick", () => {
    const onTick = vi.fn();
    const timer = createCountdownTimer(3, { onTick });
    timer.start();
    expect(onTick).toHaveBeenCalledWith(3);
    tick();
    expect(onTick).toHaveBeenCalledWith(2);
    tick();
    expect(onTick).toHaveBeenCalledWith(1);
  });

  it("handles pause and resume", () => {
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onExpired });
    timer.start();
    timer.pause();
    tick();
    tick();
    expect(onExpired).not.toHaveBeenCalled();
    timer.resume();
    tick();
    tick();
    expect(onExpired).toHaveBeenCalled();
  });

  it("calls expiration callback", () => {
    const onExpired = vi.fn();
    const timer = createCountdownTimer(1, { onExpired });
    timer.start();
    tick();
    expect(onExpired).toHaveBeenCalled();
  });

  it.each([0, -1])("expires immediately for non-positive duration %i", (dur) => {
    const onTick = vi.fn();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(dur, { onTick, onExpired });
    timer.start();
    expect(onTick).toHaveBeenCalledOnce();
    expect(onTick).toHaveBeenCalledWith(0);
    expect(onExpired).toHaveBeenCalledOnce();
    tick();
    expect(onTick).toHaveBeenCalledOnce();
  });
});
