import { describe, it, expect, vi } from "vitest";
import { createStateManager } from "../src/helpers/classicBattle/stateManager.js";

describe("Simple State Machine Test", () => {
  it("should transition state correctly", async () => {
    const simpleStateTable = [
      { name: "initial", type: "initial", triggers: [{ on: "start", target: "running" }] },
      { name: "running", triggers: [] }
    ];

    const machine = await createStateManager(
      {},
      {},
      () => {}, // onTransition hook
      simpleStateTable
    );

    expect(machine.getState()).toBe("initial");

    await machine.dispatch("start");

    expect(machine.getState()).toBe("running");
  });
});