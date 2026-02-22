import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const emitBattleEvent = vi.fn();
const offBattleEvent = vi.fn();
let skipCooldownHandler;

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent,
  offBattleEvent,
  onBattleEvent: vi.fn((evt, fn) => {
    if (evt === "skipCooldown") skipCooldownHandler = fn;
  })
}));

vi.mock("../../../src/helpers/classicBattle/guard.js", () => ({
  guard: vi.fn((fn) => {
    try {
      fn();
    } catch {}
  }),
  guardAsync: vi.fn((fn) => {
    try {
      fn();
    } catch {}
  })
}));

vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundReadyState.js", () => ({
  hasReadyBeenDispatchedForCurrentCooldown: vi.fn(() => false),
  resetReadyDispatchState: vi.fn(),
  setReadyDispatchedForCurrentCooldown: vi.fn()
}));

describe("initInterRoundCooldown (turn-based)", () => {
  let machine;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    offBattleEvent.mockReset();
    skipCooldownHandler = null;
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    machine = { dispatch: vi.fn(), getState: () => "roundWait" };
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enables the Next button immediately", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, {});
    const btn = document.getElementById("next-button");
    expect(btn.disabled).toBe(false);
  });

  it("emits nextRoundTimerReady", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, {});
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
  });

  it("dispatches ready when skipCooldown fires", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, {});
    expect(skipCooldownHandler).toBeTypeOf("function");
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });

  it("only dispatches ready once even if skipCooldown fires multiple times", async () => {
    const { initInterRoundCooldown } = await import(
      "../../../src/helpers/classicBattle/cooldowns.js"
    );
    await initInterRoundCooldown(machine, {});
    skipCooldownHandler();
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
  });
});
