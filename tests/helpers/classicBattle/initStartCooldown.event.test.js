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

describe("initStartCooldown (turn-based)", () => {
  let machine;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    offBattleEvent.mockReset();
    skipCooldownHandler = null;
    machine = { dispatch: vi.fn() };
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches ready when skipCooldown event fires", async () => {
    const { initStartCooldown } = await import("../../../src/helpers/classicBattle/cooldowns.js");
    await initStartCooldown(machine);
    // skipCooldown listener should have been registered
    expect(skipCooldownHandler).toBeTypeOf("function");
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });

  it("emits nextRoundTimerReady on init", async () => {
    const { initStartCooldown } = await import("../../../src/helpers/classicBattle/cooldowns.js");
    await initStartCooldown(machine);
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
  });

  it("only dispatches ready once even if skipCooldown fires multiple times", async () => {
    const { initStartCooldown } = await import("../../../src/helpers/classicBattle/cooldowns.js");
    await initStartCooldown(machine);
    skipCooldownHandler();
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
  });
});
