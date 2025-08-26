import { describe, it, expect, vi, afterEach } from "vitest";
import { setMachine } from "../../../src/helpers/classicBattle/eventDispatcher.js";
import * as selectionHandler from "../../../src/helpers/classicBattle/selectionHandler.js";

describe("resolveRoundViaMachine pending events", () => {
  afterEach(() => {
    setMachine(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("flushes queued statSelected once machine is ready", async () => {
    vi.useFakeTimers();
    setMachine(null);
    const store = { playerChoice: "power" };
    const directSpy = vi.spyOn(selectionHandler, "resolveRoundDirect").mockResolvedValue();
    const machine = {
      dispatch: vi.fn(async () => {
        store.playerChoice = null;
      })
    };

    const promise = selectionHandler.resolveRoundViaMachine(store, "power", 1, 2);
    expect(vi.getTimerCount()).toBe(1);

    setMachine(machine);
    await promise;

    expect(machine.dispatch).toHaveBeenCalledWith("statSelected", undefined);
    expect(store.playerChoice).toBeNull();
    expect(directSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
