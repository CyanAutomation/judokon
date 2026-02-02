import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createBattleCLIHandlersHarness } from "../helpers/integrationHarness.js";
import { withProcessStdoutDisabled } from "../utils/process.js";

describe("Classic Battle event dispatcher stdout guard", () => {
  const harness = createBattleCLIHandlersHarness();

  beforeEach(async () => {
    await harness.setup();
  });

  afterEach(async () => {
    if (harness.timerControl) {
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();
    }
    if (typeof window !== "undefined") {
      const debugMap = window.__classicBattleDebugMap;
      if (debugMap && typeof debugMap.clear === "function") {
        debugMap.clear();
      }
    }
    harness.cleanup();
  });

  it("returns false and logs error when stdout unavailable during dispatch failures", async () => {
    const { exposeDebugState } = await harness.importModule(
      "../../src/helpers/classicBattle/debugHooks.js"
    );
    const { dispatchBattleEvent } = await harness.importModule(
      "../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const battleEvents = await harness.importModule(
      "../../src/helpers/classicBattle/battleEvents.js"
    );
    const emitBattleEvent = vi.spyOn(battleEvents, "emitBattleEvent");

    const machineError = new Error("machine dispatch failed");
    const machine = {
      dispatch: vi.fn(async () => {
        throw machineError;
      }),
      getState: vi.fn(() => "roundWait")
    };

    exposeDebugState("getClassicBattleMachine", () => machine);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await withProcessStdoutDisabled(() => dispatchBattleEvent("ready"));

    expect(result).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      "Error dispatching battle event:",
      "ready",
      machineError
    );
    expect(emitBattleEvent).toHaveBeenCalledWith("debugPanelUpdate");
  });
});
