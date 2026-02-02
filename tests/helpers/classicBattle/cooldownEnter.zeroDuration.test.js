import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: vi.fn(async () => 0)
}));

vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  getNextRoundControls: vi.fn(() => ({ timer: true })),
  setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
}));

import {
  roundWaitEnter,
  roundSelectEnter
} from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";

describe("roundWaitEnter zero duration", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
  });

  it("enables stat buttons after zero-second matchStart cooldown", async () => {
    const states = [
      {
        name: "roundWait",
        type: "initial",
        triggers: [{ on: "ready", target: "roundSelect" }]
      },
      { name: "roundSelect", triggers: [] }
    ];
    const machine = await createStateManager(
      { roundSelect: roundSelectEnter },
      { store: { roundReadyForInput: true } },
      undefined,
      states
    );

    await roundWaitEnter(machine, { initial: true });
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownStart", { duration: 1 });

    await timers.advanceTimersByTimeAsync(1200);
    expect(emitBattleEvent).toHaveBeenCalledWith("statButtons:enable");
  });
});
