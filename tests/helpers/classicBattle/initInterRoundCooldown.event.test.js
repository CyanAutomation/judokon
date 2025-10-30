import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

const emitBattleEvent = vi.fn();

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent,
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: vi.fn(() => 0)
}));

// Deterministic no-op round timer
vi.mock("../../../src/helpers/timers/createRoundTimer.js", async () => {
  const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
  mockCreateRoundTimer({
    scheduled: false,
    ticks: [],
    expire: false
  });
  return await import("../../../src/helpers/timers/createRoundTimer.js");
});

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  startCoolDown: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  setupFallbackTimer: vi.fn()
}));

function createDisabledSpy(btn) {
  let count = 0;
  Object.defineProperty(btn, "disabled", {
    configurable: true,
    get() {
      return this._disabled;
    },
    set(val) {
      count++;
      this._disabled = val;
    }
  });
  btn._disabled = true;
  return () => count;
}

describe("initInterRoundCooldown", () => {
  let machine;
  let scheduler;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    machine = { dispatch: vi.fn(), getState: () => "cooldown" };
    vi.resetModules();
    scheduler = {
      setTimeout: (cb, ms) => setTimeout(cb, ms),
      clearTimeout: (id) => clearTimeout(id)
    };
    globalThis.__MOCK_ROUND_TIMERS = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.__MOCK_ROUND_TIMERS;
  });

  it("enables button and emits event", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, { scheduler });
    const btn = document.getElementById("next-button");
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.nextReady).toBe("true");
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
  });

  it("still enables button and emits event when a prior emit fails", async () => {
    emitBattleEvent.mockImplementation((evt) => {
      if (evt === "countdownStart") throw new Error("boom");
    });
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, { scheduler });
    const btn = document.getElementById("next-button");
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.nextReady).toBe("true");
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
  });

  it("reapplies readiness when reset before timeout", async () => {
    const timers = useCanonicalTimers();
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    const btn = document.getElementById("next-button");
    const getDisabledSetCount = createDisabledSpy(btn);
    await initInterRoundCooldown(machine, { scheduler });
    expect(getDisabledSetCount()).toBe(1);
    btn.dataset.nextReady = "";
    await vi.runAllTimersAsync();
    expect(btn.dataset.nextReady).toBe("true");
    expect(getDisabledSetCount()).toBe(2);
    timers.cleanup();
  });

  it("does not reapply readiness when already ready", async () => {
    const timers = useCanonicalTimers();
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    const btn = document.getElementById("next-button");
    const getDisabledSetCount = createDisabledSpy(btn);
    await initInterRoundCooldown(machine, { scheduler });
    await vi.runAllTimersAsync();
    expect(getDisabledSetCount()).toBe(1);
    timers.cleanup();
  });

  it("pauses and resumes the cooldown timer on visibility changes", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, { scheduler });

    const timers = globalThis.__MOCK_ROUND_TIMERS || [];
    const timerInstance = timers.at(-1);
    expect(timerInstance).toBeTruthy();
    const pauseSpy = timerInstance.pause;
    const resumeSpy = timerInstance.resume;

    const originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden");
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(resumeSpy).toHaveBeenCalledTimes(1);

    const expiredHandlerEntry = timerInstance.on.mock.calls.find(([evt]) => evt === "expired");
    expect(expiredHandlerEntry).toBeTruthy();
    expiredHandlerEntry[1]?.();

    if (originalHiddenDescriptor) {
      Object.defineProperty(document, "hidden", originalHiddenDescriptor);
    } else {
      delete document.hidden;
    }
  });
});
