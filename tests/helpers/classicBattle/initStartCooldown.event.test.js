import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const emitBattleEvent = vi.fn();
let finished;

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent,
  onBattleEvent: vi.fn((evt, fn) => {
    if (evt === "countdownFinished") finished = fn;
  }),
  offBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: vi.fn(() => 1)
}));

vi.mock("../../../src/helpers/testModeUtils.js", () => ({
  isTestModeEnabled: () => false
}));

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
}));

describe("initStartCooldown", () => {
  let machine;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    finished = null;
    machine = { dispatch: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches ready when countdown finishes", async () => {
    const { initStartCooldown } = await import("../../../src/helpers/classicBattle/cooldowns.js");
    await initStartCooldown(machine);
    finished();
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });

  it("dispatches ready via fallback timer", async () => {
    vi.useFakeTimers();
    const { initStartCooldown } = await import("../../../src/helpers/classicBattle/cooldowns.js");
    await initStartCooldown(machine);
    await vi.runAllTimersAsync();
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });
});
