import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

import {
  dispatchBattleEvent,
  resetDispatchHistory
} from "../../src/helpers/classicBattle/eventDispatcher.js";

describe("Classic Battle event dispatcher stdout guard", () => {
  it("does not throw when process.stdout is unavailable", async () => {
    vi.useFakeTimers();

    const originalDescriptor = Object.getOwnPropertyDescriptor(process, "stdout");
    Object.defineProperty(process, "stdout", {
      value: undefined,
      configurable: true,
      writable: true
    });

    const machine = {
      dispatch: vi.fn(async () => "dispatched"),
      getState: vi.fn(() => "cooldown")
    };

    globalThis.__classicBattleDebugRead = (token) => {
      if (token === "getClassicBattleMachine") {
        return () => machine;
      }
      return undefined;
    };

    try {
      await withMutedConsole(async () => {
        await expect(dispatchBattleEvent("ready")).resolves.toBe("dispatched");
        await expect(dispatchBattleEvent("ready")).resolves.toBe(true);
        expect(machine.dispatch).toHaveBeenCalledTimes(1);
        resetDispatchHistory("ready");
        resetDispatchHistory();
      });
    } finally {
      vi.advanceTimersByTime(25);
      await vi.runAllTimersAsync();
      vi.useRealTimers();
      if (originalDescriptor) {
        Object.defineProperty(process, "stdout", originalDescriptor);
      } else {
        delete process.stdout;
      }
      delete globalThis.__classicBattleDebugRead;
    }
  });
});
