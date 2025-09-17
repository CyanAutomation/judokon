import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => {
  const setupFallbackTimer = vi.fn((ms, cb) => setTimeout(cb, ms));
  const startCooldown = vi.fn((store, scheduler = {}) => {
    const dispatchers = [];
    if (store && typeof store.dispatch === "function") {
      dispatchers.push(() => store.dispatch("ready"));
    }
    if (scheduler && typeof scheduler.dispatch === "function") {
      dispatchers.push(() => scheduler.dispatch("ready"));
    }
    if (scheduler?.machine && typeof scheduler.machine.dispatch === "function") {
      dispatchers.push(() => scheduler.machine.dispatch("ready"));
    }

    let resolved = false;
    const triggerReady = () => {
      if (resolved) return;
      resolved = true;
      for (const sendReady of dispatchers) {
        try {
          sendReady();
        } catch {}
      }
    };

    const schedule =
      scheduler && typeof scheduler.setTimeout === "function"
        ? scheduler.setTimeout.bind(scheduler)
        : setTimeout;

    setupFallbackTimer(1000, triggerReady);
    schedule(triggerReady, 1000);

    return {
      timer: null,
      resolveReady: triggerReady,
      ready: Promise.resolve()
    };
  });

  return {
    getNextRoundControls: vi.fn(() => null),
    setupFallbackTimer,
    startCooldown
  };
});
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: vi.fn(() => 1)
}));

import { cooldownEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("cooldownEnter", () => {
  let timerSpy;
  let machine;
  beforeEach(() => {
    timerSpy = vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    machine = { dispatch: vi.fn(), getState: vi.fn(() => "cooldown") };
    const scheduler = {
      machine,
      setTimeout: (cb, ms) => setTimeout(cb, ms),
      clearTimeout: (id) => clearTimeout(id)
    };
    machine.context = { store: { dispatch: machine.dispatch }, scheduler };
  });
  afterEach(() => {
    timerSpy.clearAllTimers();
    vi.restoreAllMocks();
  });
  it("auto dispatches ready after 1s timer", async () => {
    await cooldownEnter(machine);
    expect(machine.dispatch).not.toHaveBeenCalled();
    await timerSpy.advanceTimersByTimeAsync(1200); // 1s duration + 200ms fallback
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });
});
