import { describe, it, expect } from "vitest";
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";

describe("classic battle interrupt flow", () => {
  it("routes matchStart → interruptMatch → matchOver with payloads", async () => {
    const payloads = {};
    const states = new Map([
      [
        "matchStart",
        { name: "matchStart", triggers: [{ on: "interruptMatch", target: "interruptMatch" }] }
      ],
      [
        "interruptMatch",
        {
          name: "interruptMatch",
          triggers: [
            { on: "interruptMatch", target: "matchOver" },
            { on: "toLobby", target: "waitingForMatchStart" }
          ]
        }
      ],
      ["matchOver", { name: "matchOver", triggers: [] }],
      ["waitingForMatchStart", { name: "waitingForMatchStart", triggers: [] }]
    ]);

    const machine = new BattleStateMachine(states, "matchStart", {
      interruptMatch: (_, payload) => {
        payloads.interruptMatch = payload;
      },
      matchOver: (_, payload) => {
        payloads.matchOver = payload;
      }
    });

    await machine.dispatch("interruptMatch", { reason: "disconnect" });
    expect(machine.getState()).toBe("interruptMatch");
    expect(payloads.interruptMatch).toEqual({ reason: "disconnect" });

    await machine.dispatch("interruptMatch", { adminTest: true });
    expect(machine.getState()).toBe("matchOver");
    expect(payloads.matchOver).toEqual({ adminTest: true });
  });

  it("returns to waitingForMatchStart on toLobby", async () => {
    const payloads = {};
    const states = new Map([
      [
        "matchStart",
        { name: "matchStart", triggers: [{ on: "interruptMatch", target: "interruptMatch" }] }
      ],
      [
        "interruptMatch",
        {
          name: "interruptMatch",
          triggers: [
            { on: "interruptMatch", target: "matchOver" },
            { on: "toLobby", target: "waitingForMatchStart" }
          ]
        }
      ],
      ["matchOver", { name: "matchOver", triggers: [] }],
      ["waitingForMatchStart", { name: "waitingForMatchStart", triggers: [] }]
    ]);

    const machine = new BattleStateMachine(states, "matchStart", {
      waitingForMatchStart: (_, payload) => {
        payloads.waitingForMatchStart = payload;
      }
    });

    await machine.dispatch("interruptMatch");
    await machine.dispatch("toLobby", { adminTest: true });
    expect(machine.getState()).toBe("waitingForMatchStart");
    expect(payloads.waitingForMatchStart).toEqual({ adminTest: true });
  });

  it("handles roundModification path and resumeRound payload", async () => {
    const payloads = {};
    const states = new Map([
      [
        "interruptRound",
        {
          name: "interruptRound",
          triggers: [{ on: "roundModifyFlag", target: "roundModification" }]
        }
      ],
      [
        "roundModification",
        {
          name: "roundModification",
          triggers: [
            { on: "modifyRoundDecision", target: "roundStart" },
            { on: "cancelModification", target: "cooldown" }
          ]
        }
      ],
      ["roundStart", { name: "roundStart", triggers: [] }],
      ["cooldown", { name: "cooldown", triggers: [] }]
    ]);

    const machine = new BattleStateMachine(states, "interruptRound", {
      roundModification: (_, payload) => {
        payloads.roundModification = payload;
      },
      roundStart: (_, payload) => {
        payloads.roundStart = payload;
      },
      cooldown: () => {
        payloads.cooldown = true;
      }
    });

    await machine.dispatch("roundModifyFlag", { reason: "score adjusted" });
    expect(machine.getState()).toBe("roundModification");
    expect(payloads.roundModification).toEqual({ reason: "score adjusted" });

    await machine.dispatch("modifyRoundDecision", { resumeRound: true, adminTest: true });
    expect(machine.getState()).toBe("roundStart");
    expect(payloads.roundStart).toEqual({ resumeRound: true, adminTest: true });
  });

  it("cancels modification and goes to cooldown", async () => {
    const states = new Map([
      [
        "interruptRound",
        {
          name: "interruptRound",
          triggers: [{ on: "roundModifyFlag", target: "roundModification" }]
        }
      ],
      [
        "roundModification",
        {
          name: "roundModification",
          triggers: [
            { on: "modifyRoundDecision", target: "roundStart" },
            { on: "cancelModification", target: "cooldown" }
          ]
        }
      ],
      ["roundStart", { name: "roundStart", triggers: [] }],
      ["cooldown", { name: "cooldown", triggers: [] }]
    ]);

    const machine = new BattleStateMachine(states, "interruptRound", {});
    await machine.dispatch("roundModifyFlag");
    await machine.dispatch("cancelModification");
    expect(machine.getState()).toBe("cooldown");
  });
});
