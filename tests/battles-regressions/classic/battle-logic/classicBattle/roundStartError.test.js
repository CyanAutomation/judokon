import { describe, it, expect, vi } from "vitest";

import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { roundStartEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("round start error recovery", () => {
  it("dispatches interrupt when drawCards rejects", async () => {
    vi.resetModules();
    vi.doMock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
      drawCards: vi.fn().mockRejectedValue(new Error("no cards")),
      _resetForTest: vi.fn()
    }));
    const { startRound } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const states = [
      {
        name: "roundStart",
        type: "initial",
        triggers: [
          { on: "cardsRevealed", target: "waitingForPlayerAction" },
          { on: "interrupt", target: "interruptRound" }
        ]
      },
      {
        name: "waitingForPlayerAction",
        triggers: [{ on: "interrupt", target: "interruptRound" }]
      },
      { name: "interruptRound", triggers: [] }
    ];
    const machine = await createStateManager(
      { roundStart: roundStartEnter },
      { doStartRound: startRound, store: {} },
      undefined,
      states
    );
    const spy = vi.spyOn(machine, "dispatch");

    await roundStartEnter(machine);

    expect(machine.getState()).toBe("interruptRound");
    expect(spy).toHaveBeenCalledWith("interrupt", {
      reason: "roundStartError",
      error: "no cards"
    });
  });

  it("dispatches interrupt when startRoundWrapper throws", async () => {
    vi.resetModules();
    const startRoundWrapper = () => {
      throw new Error("sync fail");
    };
    const states = [
      {
        name: "roundStart",
        type: "initial",
        triggers: [
          { on: "cardsRevealed", target: "waitingForPlayerAction" },
          { on: "interrupt", target: "interruptRound" }
        ]
      },
      {
        name: "waitingForPlayerAction",
        triggers: [{ on: "interrupt", target: "interruptRound" }]
      },
      { name: "interruptRound", triggers: [] }
    ];
    const machine = await createStateManager(
      { roundStart: roundStartEnter },
      { startRoundWrapper },
      undefined,
      states
    );
    const spy = vi.spyOn(machine, "dispatch");

    await roundStartEnter(machine);

    expect(machine.getState()).toBe("interruptRound");
    expect(spy).toHaveBeenCalledWith("interrupt", {
      reason: "roundStartError",
      error: "sync fail"
    });
  });
});
