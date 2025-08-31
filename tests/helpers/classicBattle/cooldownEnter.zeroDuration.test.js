import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: vi.fn(async () => 0)
}));

vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  getNextRoundControls: vi.fn(() => ({ timer: true })),
  setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
}));

import {
  cooldownEnter,
  waitingForPlayerActionEnter
} from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";

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
    const states = new Map([
      [
        "cooldown",
        { name: "cooldown", triggers: [{ on: "ready", target: "waitingForPlayerAction" }] }
      ],
      ["waitingForPlayerAction", { name: "waitingForPlayerAction", triggers: [] }]
    ]);
    const machine = new BattleStateMachine(
      states,
      "cooldown",
      { waitingForPlayerAction: waitingForPlayerActionEnter },
      { store: {} }
    );

    await cooldownEnter(machine, { initial: true });
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownStart", { duration: 1 });

    await timer.advanceTimersByTimeAsync(1200);
    expect(emitBattleEvent).toHaveBeenCalledWith("statButtons:enable");
  });
});
