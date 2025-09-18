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
    const results = [];
    await withMutedConsole(async () => {
      results.push(await dispatchBattleEvent("ready"));
      expect(machine.dispatch).toHaveBeenCalledTimes(1);

      results.push(await dispatchBattleEvent("ready"));
      expect(machine.dispatch).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(25);
      await vi.runAllTimersAsync();

      results.push(await dispatchBattleEvent("ready"));
      expect(machine.dispatch).toHaveBeenCalledTimes(2);
    });

    expect(results[0]).toBe("dispatched");
    expect(results[1]).toBe(true);
    expect(results[2]).toBe("dispatched");
  });
});
