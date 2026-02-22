import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Turn-based flow: roundWaitEnter no longer starts a timer or emits countdownStart.
// It calls initTurnBasedWait, which emits nextRoundTimerReady and waits for
// a skipCooldown event before dispatching "ready".

const emitBattleEvent = vi.fn();
let skipCooldownHandler;

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent,
  offBattleEvent: vi.fn(),
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

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  getNextRoundControls: vi.fn(() => null)
}));

import { roundWaitEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("roundWaitEnter (turn-based)", () => {
  let machine;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    skipCooldownHandler = null;
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    machine = { dispatch: vi.fn(), getState: vi.fn(() => "roundWait"), context: {} };
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits nextRoundTimerReady (not countdownStart) on match start", async () => {
    await roundWaitEnter(machine, { initial: true });
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
    expect(emitBattleEvent).not.toHaveBeenCalledWith("countdownStart", expect.anything());
  });

  it("enables stat buttons once skipCooldown dispatches ready", async () => {
    await roundWaitEnter(machine, { initial: true });
    expect(skipCooldownHandler).toBeTypeOf("function");
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });
});
