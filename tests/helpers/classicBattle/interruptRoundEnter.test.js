import { describe, it, expect, vi } from "vitest";
import { interruptRoundEnter, interruptMatchEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("interrupt handlers dispatch valid state-table triggers", () => {
  it("interruptRoundEnter dispatches restartRound (not cooldown)", async () => {
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined), context: { store: {} } };
    await interruptRoundEnter(machine, { reason: "noSelection" });
    expect(machine.dispatch).toHaveBeenCalledWith("restartRound");
  });

  it("interruptMatchEnter dispatches toLobby (not matchOver)", async () => {
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined), context: { store: {} } };
    await interruptMatchEnter(machine, { reason: "fatal" });
    expect(machine.dispatch).toHaveBeenCalledWith("toLobby", { reason: "fatal" });
  });
});
