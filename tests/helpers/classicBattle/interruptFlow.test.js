import { describe, it, expect } from "vitest";
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";

describe("classic battle interrupt flow", () => {
  it("advances from interruptRound to matchOver on abort", async () => {
    const states = new Map([
      [
        "roundStart",
        { name: "roundStart", triggers: [{ on: "interrupt", target: "interruptRound" }] }
      ],
      [
        "interruptRound",
        { name: "interruptRound", triggers: [{ on: "abortMatch", target: "matchOver" }] }
      ],
      ["matchOver", { name: "matchOver", triggers: [] }]
    ]);

    const machine = new BattleStateMachine(states, "roundStart", {});
    await machine.dispatch("interrupt");
    expect(machine.getState()).toBe("interruptRound");
    await machine.dispatch("abortMatch");
    expect(machine.getState()).toBe("matchOver");
  });
});
