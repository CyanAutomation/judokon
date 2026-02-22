import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { roundState } from "../../../src/helpers/classicBattle/roundState.js";

// Turn-based flow: roundWaitEnter registers a skipCooldown listener instead of
// starting a cooldown timer. The player advances by clicking "Next Round".

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

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  getNextRoundControls: vi.fn(() => null)
}));

import { roundWaitEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("roundWaitEnter (turn-based)", () => {
  let machine;
  beforeEach(() => {
    emitBattleEvent.mockReset();
    offBattleEvent.mockReset();
    skipCooldownHandler = null;
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    machine = { dispatch: vi.fn(), getState: vi.fn(() => "roundWait"), context: {} };
    roundState.reset();
    roundState.setRoundNumber(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers skipCooldown listener and dispatches ready on click", async () => {
    await roundWaitEnter(machine);
    expect(skipCooldownHandler).toBeTypeOf("function");
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });

  it("emits nextRoundTimerReady (not countdownStart)", async () => {
    await roundWaitEnter(machine);
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundTimerReady");
    expect(emitBattleEvent).not.toHaveBeenCalledWith("countdownStart", expect.anything());
  });

  it("only dispatches ready once even if next button clicked multiple times", async () => {
    await roundWaitEnter(machine);
    skipCooldownHandler();
    skipCooldownHandler();
    expect(machine.dispatch).toHaveBeenCalledTimes(1);
  });
});
