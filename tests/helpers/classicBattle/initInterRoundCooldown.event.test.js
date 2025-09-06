import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const emitBattleEvent = vi.fn();

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent,
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: vi.fn(() => 0)
}));

vi.mock("../../../src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: vi.fn(() => ({ on: vi.fn(), start: vi.fn() }))
}));

vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  startCoolDown: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  setupFallbackTimer: vi.fn()
}));

describe("initInterRoundCooldown", () => {
  let machine;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    machine = { dispatch: vi.fn(), getState: () => "cooldown" };
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enables button and emits event", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    await initInterRoundCooldown(machine);
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
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    await initInterRoundCooldown(machine);
    const btn = document.getElementById("next-button");
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.nextReady).toBe("true");
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
  });

  it("reapplies readiness when reset before timeout", async () => {
    vi.useFakeTimers();
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const btn = document.getElementById("next-button");
    let disabledSetCount = 0;
    Object.defineProperty(btn, "disabled", {
      configurable: true,
      get() {
        return this._disabled;
      },
      set(val) {
        disabledSetCount++;
        this._disabled = val;
      }
    });
    btn._disabled = true;
    await initInterRoundCooldown(machine);
    expect(disabledSetCount).toBe(1);
    btn.dataset.nextReady = "";
    await vi.runAllTimersAsync();
    expect(btn.dataset.nextReady).toBe("true");
    expect(disabledSetCount).toBe(2);
  });

  it("does not reapply readiness when already ready", async () => {
    vi.useFakeTimers();
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const btn = document.getElementById("next-button");
    let disabledSetCount = 0;
    Object.defineProperty(btn, "disabled", {
      configurable: true,
      get() {
        return this._disabled;
      },
      set(val) {
        disabledSetCount++;
        this._disabled = val;
      }
    });
    btn._disabled = true;
    await initInterRoundCooldown(machine);
    await vi.runAllTimersAsync();
    expect(disabledSetCount).toBe(1);
  });
});
