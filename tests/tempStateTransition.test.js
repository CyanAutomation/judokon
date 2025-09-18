import { describe, it, expect, beforeEach } from "vitest";
import { createStateManager } from "../src/helpers/classicBattle/stateManager.js";

describe("State Transition Debug", () => {
  let machine;
  const minimalStateTable = [
    {
      name: "waitingForMatchStart",
      type: "initial",
      triggers: []
    },
    {
      name: "roundOver",
      triggers: [{ on: "continue", target: "cooldown" }]
    },
    {
      name: "cooldown",
      triggers: []
    }
  ];

  beforeEach(async () => {
    machine = await createStateManager({}, {}, undefined, minimalStateTable);
  });

  it("should transition from roundOver to cooldown on 'continue' event", async () => {
    expect(machine.getState()).toBe("waitingForMatchStart");

    await machine.dispatch("roundOver");
    expect(machine.getState()).toBe("roundOver");

    await machine.dispatch("continue");
    expect(machine.getState()).toBe("cooldown");
  });
});
