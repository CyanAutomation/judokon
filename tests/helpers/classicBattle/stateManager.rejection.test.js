import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/battleEvents.js");
  return {
    ...actual,
    emitBattleEvent: emitSpy
  };
});

describe("stateManager rejection events", () => {
  beforeEach(() => {
    emitSpy.mockClear();
  });

  it("emits canonical rejection event when an event is invalid for current state", async () => {
    const machine = await createStateManager();

    const result = await machine.dispatch("statSelected");

    expect(result).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith(
      "battle.intent.rejected",
      expect.objectContaining({
        event: "statSelected",
        state: "waitingForMatchStart",
        reason: "intent.notAllowedInState"
      })
    );
  });
});
