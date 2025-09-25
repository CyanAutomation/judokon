import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TimerController } from "../../src/helpers/TimerController.js";

describe("TimerController countdown consistency", () => {
  let tc;
  const fakeScheduler = {
    timeouts: new Set(),
    setTimeout(fn, ms) {
      const id = { fn, ms };
      this.timeouts.add(id);
      return id;
    },
    clearTimeout(id) {
      this.timeouts.delete(id);
    }
  };
  const onSecondTick = (fn) => fakeScheduler.setTimeout(fn, 1000);
  const cancel = (id) => fakeScheduler.clearTimeout(id);

  beforeEach(() => {
    tc = new TimerController({ onSecondTick, cancel, scheduler: fakeScheduler });
  });
  afterEach(() => {
    tc.stop();
  });

  it("ticks down deterministically and calls onExpired at zero", async () => {
    const ticks = [];
    const onTick = (r) => ticks.push(r);
    const expired = vi.fn();

    await tc.startRound(onTick, expired, 3);
    // simulate 3 seconds
    [...fakeScheduler.timeouts].forEach((t) => t.fn());
    [...fakeScheduler.timeouts].forEach((t) => t.fn());
    [...fakeScheduler.timeouts].forEach((t) => t.fn());

    expect(ticks).toContain(2);
    expect(expired).toHaveBeenCalled();
  });
});
