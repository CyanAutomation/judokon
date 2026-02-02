import { describe, it, expect, vi } from "vitest";

import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { roundPromptEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockDrawCards, mockResetForTest } = vi.hoisted(() => ({
  mockDrawCards: vi.fn().mockRejectedValue(new Error("no cards")),
  mockResetForTest: vi.fn()
}));

// ===== Top-level vi.mock() call (Vitest static analysis phase) =====
vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  drawCards: mockDrawCards,
  _resetForTest: mockResetForTest
}));

describe("round start error recovery", () => {
  it("dispatches interrupt when drawCards rejects", async () => {
    vi.resetModules();
    const { startRound } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const states = [
      {
        name: "roundPrompt",
        type: "initial",
        triggers: [
          { on: "cardsRevealed", target: "roundSelect" },
          { on: "interrupt", target: "interruptRound" }
        ]
      },
      {
        name: "roundSelect",
        triggers: [{ on: "interrupt", target: "interruptRound" }]
      },
      { name: "interruptRound", triggers: [] }
    ];
    const machine = await createStateManager(
      { roundPrompt: roundPromptEnter },
      { doStartRound: startRound, store: {} },
      undefined,
      states
    );
    const spy = vi.spyOn(machine, "dispatch");

    await roundPromptEnter(machine);

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
        name: "roundPrompt",
        type: "initial",
        triggers: [
          { on: "cardsRevealed", target: "roundSelect" },
          { on: "interrupt", target: "interruptRound" }
        ]
      },
      {
        name: "roundSelect",
        triggers: [{ on: "interrupt", target: "interruptRound" }]
      },
      { name: "interruptRound", triggers: [] }
    ];
    const machine = await createStateManager(
      { roundPrompt: roundPromptEnter },
      { startRoundWrapper },
      undefined,
      states
    );
    const spy = vi.spyOn(machine, "dispatch");

    await roundPromptEnter(machine);

    expect(machine.getState()).toBe("interruptRound");
    expect(spy).toHaveBeenCalledWith("interrupt", {
      reason: "roundStartError",
      error: "sync fail"
    });
  });
});
