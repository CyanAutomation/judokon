import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockInitRoundSelectModal } = vi.hoisted(() => ({
  mockInitRoundSelectModal: vi.fn().mockRejectedValue(new Error("fail"))
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: mockInitRoundSelectModal
}));

describe("battleCLI start control", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
    mockInitRoundSelectModal.mockReset().mockRejectedValue(new Error("fail"));
  });

  afterEach(async () => {
    timers.cleanup();
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    await cleanupBattleCLI();
  });

  it("falls back to snackbar prompt and begins match on Enter", async () => {
    const mod = await loadBattleCLI();
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const { emitBattleEvent } = battleEvents;
    const { showSnackbar } = await import("../../src/helpers/showSnackbar.js");
    // Import after mocks are set up by loadBattleCLI
    const { initClassicBattleOrchestrator, dispatchBattleEvent } = await import(
      "../../src/helpers/classicBattle/orchestrator.js"
    );
    initClassicBattleOrchestrator.mockResolvedValue();
    dispatchBattleEvent.mockImplementation(async (evt) => {
      if (evt === "startClicked") {
        emitBattleEvent("battleStateChange", { to: "roundSelect" });
      }
      return true;
    });
    await mod.init();
    expect(showSnackbar).toHaveBeenCalledWith("Press Enter to start the match.");
    const emitter = battleEvents.getBattleEventTarget?.();
    if (!emitter) {
      throw new Error("Battle event emitter unavailable");
    }
    const stateChangeListener = vi.fn();
    const stateChange = new Promise((resolve) =>
      emitter.addEventListener(
        "battleStateChange",
        (event) => {
          stateChangeListener(event);
          resolve(event);
        },
        { once: true }
      )
    );
    const battleCliModule = await import("../../src/pages/battleCLI/init.js");
    const handled = battleCliModule.handleWaitingForMatchStartKey("enter");
    expect(handled).toBe(true);
    await stateChange;
    expect(dispatchBattleEvent).toHaveBeenCalledWith("startClicked");
    expect(emitBattleEvent).toHaveBeenCalledWith("battleStateChange", {
      to: "roundSelect"
    });
  });
});
