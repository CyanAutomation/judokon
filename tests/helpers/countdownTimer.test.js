import { describe, it, expect, vi } from "vitest";
const callbacks = [];
vi.mock("../../src/utils/scheduler.js", () => ({
  onSecondTick: (cb) => {
    callbacks.push(cb);
    return callbacks.length - 1;
  },
  cancel: (id) => {
    delete callbacks[id];
  }
}));
import { createCountdownTimer } from "../../src/helpers/timerUtils.js";

function tick() {
  callbacks.slice().forEach((cb) => cb());
}

describe("createCountdownTimer", () => {
  it("counts down and calls expired", () => {
    const onTick = vi.fn();
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onTick, onExpired });
    timer.start();
    expect(onTick).toHaveBeenCalledWith(2);
    tick();
    expect(onTick).toHaveBeenCalledWith(1);
    tick();
    expect(onExpired).toHaveBeenCalled();
  });

  it("pauses and resumes", () => {
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onExpired });
    timer.start();
    tick();
    timer.pause();
    tick();
    tick();
    expect(onExpired).not.toHaveBeenCalled();
    timer.resume();
    tick();
    expect(onExpired).toHaveBeenCalled();
  });

  it("auto pauses when hidden", () => {
    const onExpired = vi.fn();
    const timer = createCountdownTimer(2, { onExpired, pauseOnHidden: true });
    timer.start();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true
    });
    document.dispatchEvent(new Event("visibilitychange"));
    tick();
    tick();
    expect(onExpired).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false
    });
    document.dispatchEvent(new Event("visibilitychange"));
    tick();
    tick();
    expect(onExpired).toHaveBeenCalled();
    delete document.hidden;
  });
});
