import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withMutedConsole } from "../../utils/console.js";

import { dispatchBattleEvent } from "../../../src/helpers/classicBattle/eventDispatcher.js";

describe("dispatchBattleEvent dedupe", () => {
  let machine;

  beforeEach(() => {
    vi.useFakeTimers();
    machine = {
      dispatch: vi.fn(async () => "dispatched"),
      getState: vi.fn(() => "cooldown")
    };
    globalThis.__classicBattleDebugRead = (token) => {
      if (token === "getClassicBattleMachine") {
        return () => machine;
      }
      return undefined;
    };
  });

  afterEach(async () => {
    // Ensure scheduled cleanup timers execute before leaving the test
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    delete globalThis.__classicBattleDebugRead;
  });

  it("short-circuits rapid duplicate dispatches", async () => {
    await withMutedConsole(async () => {
      const firstResult = await dispatchBattleEvent("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe("dispatched");

      const secondResult = await dispatchBattleEvent("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(1);
      expect(secondResult).toBe(true);

      vi.advanceTimersByTime(25);
      await vi.runAllTimersAsync();

      const thirdResult = await dispatchBattleEvent("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(2);
      expect(thirdResult).toBe("dispatched");
    });
  });
});
