import { describe, it, expect, vi, beforeEach } from "vitest";

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
    machine = { dispatch: vi.fn() };
    vi.resetModules();
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
});
