import { describe, it, expect, vi } from "vitest";

import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";
import { roundStartEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("round start error recovery", () => {
  it("dispatches interrupt when drawCards rejects", async () => {
    vi.resetModules();
    vi.doMock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
      drawCards: vi.fn().mockRejectedValue(new Error("no cards")),
      _resetForTest: vi.fn()
    }));
    const { startRound } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const states = new Map([
      [
        "roundStart",
        {
          name: "roundStart",
          triggers: [
            { on: "cardsRevealed", target: "waitingForPlayerAction" },
            { on: "interrupt", target: "interruptRound" }
          ]
        }
      ],
      [
        "waitingForPlayerAction",
        {
          name: "waitingForPlayerAction",
          triggers: [{ on: "interrupt", target: "interruptRound" }]
        }
      ],
      ["interruptRound", { name: "interruptRound", triggers: [] }]
    ]);
    const machine = new BattleStateMachine(
      states,
      "roundStart",
      { roundStart: roundStartEnter },
      { doStartRound: startRound, store: {} }
    );

    await roundStartEnter(machine);

    expect(machine.getState()).toBe("interruptRound");
  });
});
