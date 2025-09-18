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

  it("short-circuits concurrent duplicate dispatches", async () => {
    await withMutedConsole(async () => {
      const firstPromise = dispatchBattleEvent("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(1);

      const secondPromise = dispatchBattleEvent("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(1);
      expect(secondPromise).toBe(firstPromise);

      await vi.runAllTimersAsync();
      await expect(firstPromise).resolves.toBe("dispatched");
      await expect(secondPromise).resolves.toBe("dispatched");

      const thirdPromise = dispatchBattleEvent("ready");
      expect(machine.dispatch).toHaveBeenCalledTimes(2);
      await expect(thirdPromise).resolves.toBe("dispatched");
    });
  });
});
