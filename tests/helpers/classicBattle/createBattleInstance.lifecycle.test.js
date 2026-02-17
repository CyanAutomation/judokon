import { describe, it, expect, vi } from "vitest";
import { createBattleInstance } from "../../../src/helpers/classicBattle/createBattleInstance.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

describe("createBattleInstance lifecycle", () => {
  it("does not duplicate listeners/events across init-dispose cycles", async () => {
    const observed = [];
    const orchestratorDispose = vi.fn();

    const orchestratorInit = vi.fn(async (_context, _dependencies, _hooks, options = {}) => {
      const bus = options?.battleEventBus;
      bus.on("lifecycle.test", (event) => {
        observed.push(event.detail?.cycle ?? "unknown");
      });
      return { state: "ready" };
    });

    const first = createBattleInstance({ orchestratorInit, orchestratorDispose });
    await first.init({}, {});
    emitBattleEvent("lifecycle.test", { cycle: "first" });
    first.dispose();
    emitBattleEvent("lifecycle.test", { cycle: "after-first-dispose" });

    expect(observed).toEqual(["first"]);

    const second = createBattleInstance({ orchestratorInit, orchestratorDispose });
    await second.init({}, {});
    emitBattleEvent("lifecycle.test", { cycle: "second" });
    second.dispose();

    expect(observed).toEqual(["first", "second"]);
    expect(orchestratorInit).toHaveBeenCalledTimes(2);
    expect(orchestratorDispose).toHaveBeenCalledTimes(2);
  });

  it("dispatchIntent is the sole transition gateway with standardized results", async () => {
    const machineDispatch = vi.fn().mockResolvedValue(true);
    const orchestratorInit = vi.fn(async () => ({ dispatch: machineDispatch }));
    const battle = createBattleInstance({ orchestratorInit });
    await battle.init({}, {});

    const accepted = await battle.dispatchIntent("ready");
    expect(machineDispatch).toHaveBeenCalledWith("ready");
    expect(accepted).toMatchObject({ accepted: true, rejected: false });

    machineDispatch.mockResolvedValueOnce(false);
    const rejected = await battle.dispatchIntent("continue");
    expect(rejected).toMatchObject({
      accepted: false,
      rejected: true,
      reason: "intent_rejected"
    });
  });
});
