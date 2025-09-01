import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  cooldownEnter,
  waitingForPlayerActionEnter
} from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";

describe("cooldownEnter zero duration", () => {
  let timer;
  beforeEach(() => {
    timer = vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    timer.clearAllTimers();
    vi.restoreAllMocks();
  });

  it("enables stat buttons after zero-second matchStart cooldown", async () => {
    const states = [
      {
        name: "cooldown",
        type: "initial",
        triggers: [{ on: "ready", target: "waitingForPlayerAction" }]
      },
      { name: "waitingForPlayerAction", triggers: [] }
    ];
    const machine = await createStateManager(
      { waitingForPlayerAction: waitingForPlayerActionEnter },
      { store: {} },
      undefined,
      states
    );

    await cooldownEnter(machine, { initial: true });
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownStart", { duration: 1 });

    await timer.advanceTimersByTimeAsync(1200);
    expect(emitBattleEvent).toHaveBeenCalledWith("statButtons:enable");
  });
});
