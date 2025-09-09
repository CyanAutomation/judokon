import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI start control", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
      initRoundSelectModal: vi.fn().mockRejectedValue(new Error("fail"))
    }));
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.doUnmock("../../src/helpers/classicBattle/roundSelectModal.js");
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    await cleanupBattleCLI();
  });

  it("falls back to Start button and begins match", async () => {
    const mod = await loadBattleCLI();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    const { initClassicBattleOrchestrator } = await import(
      "../../src/helpers/classicBattle/orchestrator.js"
    );
    let machine;
    initClassicBattleOrchestrator.mockImplementation(() => {
      machine = {
        dispatch: vi.fn((evt) => {
          if (evt === "startClicked") {
            emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
          }
        })
      };
      debugHooks.exposeDebugState("getClassicBattleMachine", () => machine);
      return Promise.resolve();
    });
    await mod.init();
    const btn = document.getElementById("start-match-button");
    expect(btn).toBeTruthy();
    btn.click();
    expect(emitBattleEvent).toHaveBeenCalledWith("battleStateChange", {
      to: "waitingForPlayerAction"
    });
  });
});
