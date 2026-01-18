import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withMutedConsole } from "../../utils/console.js";

import * as battleEvents from "../../../src/helpers/classicBattle/battleEvents.js";
import { dispatchBattleEvent } from "../../../src/helpers/classicBattle/eventDispatcher.js";

describe("dispatchBattleEvent diagnostics", () => {
  let machine;

  beforeEach(() => {
    machine = {
      dispatch: vi.fn(async () => "dispatched"),
      getState: vi.fn(() => "matchStart")
    };

    globalThis.__classicBattleDebugRead = (token) => {
      if (token === "getClassicBattleMachine") {
        return () => machine;
      }
      return undefined;
    };
  });

  afterEach(() => {
    delete globalThis.__classicBattleDebugRead;
  });

  it("emits interrupt.requested for interrupts (PRD: prdEventContracts.md#interrupt-requested)", async () => {
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    await withMutedConsole(async () => {
      await dispatchBattleEvent("interrupt", { reason: "userAbort" });
    });

    expect(emitSpy).toHaveBeenCalledWith("interrupt.requested", {
      scope: "match",
      reason: "userAbort"
    });
  });
});
