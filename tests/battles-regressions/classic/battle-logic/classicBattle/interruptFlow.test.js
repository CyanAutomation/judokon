import { describe, it, expect } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";

describe("classic battle interrupt flow", () => {
  it("routes matchStart → interruptMatch → matchOver with payloads", async () => {
    const payloads = {};
    const states = [
      {
        name: "matchStart",
        type: "initial",
        triggers: [{ on: "interruptMatch", target: "interruptMatch" }]
      },
      {
        name: "interruptMatch",
        triggers: [
          { on: "interruptMatch", target: "matchOver" },
          { on: "toLobby", target: "waitingForMatchStart" }
        ]
      },
      { name: "matchOver", triggers: [] },
      { name: "waitingForMatchStart", triggers: [] }
    ];

    const machine = await createStateManager(
      {
        interruptMatch: (_, payload) => {
          payloads.interruptMatch = payload;
        },
        matchOver: (_, payload) => {
          payloads.matchOver = payload;
        }
      },
      {},
      undefined,
      states
    );

    await machine.dispatch("interruptMatch", { reason: "disconnect" });
    expect(machine.getState()).toBe("interruptMatch");
    expect(payloads.interruptMatch).toEqual({ reason: "disconnect" });

    await machine.dispatch("interruptMatch", { adminTest: true });
    expect(machine.getState()).toBe("matchOver");
    expect(payloads.matchOver).toEqual({ adminTest: true });
  });

  it("returns to waitingForMatchStart on toLobby", async () => {
    const payloads = {};
    const states = [
      {
        name: "matchStart",
        type: "initial",
        triggers: [{ on: "interruptMatch", target: "interruptMatch" }]
      },
      {
        name: "interruptMatch",
        triggers: [
          { on: "interruptMatch", target: "matchOver" },
          { on: "toLobby", target: "waitingForMatchStart" }
        ]
      },
      { name: "matchOver", triggers: [] },
      { name: "waitingForMatchStart", triggers: [] }
    ];

    const machine = await createStateManager(
      {
        waitingForMatchStart: (_, payload) => {
          payloads.waitingForMatchStart = payload;
        }
      },
      {},
      undefined,
      states
    );

    await machine.dispatch("interruptMatch");
    await machine.dispatch("toLobby", { adminTest: true });
    expect(machine.getState()).toBe("waitingForMatchStart");
    expect(payloads.waitingForMatchStart).toEqual({ adminTest: true });
  });

  it("handles roundModification path and resumeRound payload", async () => {
    const payloads = {};
    const states = [
      {
        name: "interruptRound",
        type: "initial",
        triggers: [{ on: "roundModifyFlag", target: "roundModification" }]
      },
      {
        name: "roundModification",
        triggers: [
          { on: "modifyRoundDecision", target: "roundStart" },
          { on: "cancelModification", target: "cooldown" }
        ]
      },
      { name: "roundStart", triggers: [] },
      { name: "cooldown", triggers: [] }
    ];

    const machine = await createStateManager(
      {
        roundModification: (_, payload) => {
          payloads.roundModification = payload;
        },
        roundStart: (_, payload) => {
          payloads.roundStart = payload;
        },
        cooldown: () => {
          payloads.cooldown = true;
        }
      },
      {},
      undefined,
      states
    );

    await machine.dispatch("roundModifyFlag", { reason: "score adjusted" });
    expect(machine.getState()).toBe("roundModification");
    expect(payloads.roundModification).toEqual({ reason: "score adjusted" });

    await machine.dispatch("modifyRoundDecision", { resumeRound: true, adminTest: true });
    expect(machine.getState()).toBe("roundStart");
    expect(payloads.roundStart).toEqual({ resumeRound: true, adminTest: true });
  });

  it("cancels modification and goes to cooldown", async () => {
    const states = [
      {
        name: "interruptRound",
        type: "initial",
        triggers: [{ on: "roundModifyFlag", target: "roundModification" }]
      },
      {
        name: "roundModification",
        triggers: [
          { on: "modifyRoundDecision", target: "roundStart" },
          { on: "cancelModification", target: "cooldown" }
        ]
      },
      { name: "roundStart", triggers: [] },
      { name: "cooldown", triggers: [] }
    ];

    const machine = await createStateManager({}, {}, undefined, states);
    await machine.dispatch("roundModifyFlag");
    await machine.dispatch("cancelModification");
    expect(machine.getState()).toBe("cooldown");
  });
});
