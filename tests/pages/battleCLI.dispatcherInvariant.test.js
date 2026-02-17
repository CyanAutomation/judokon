import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanupBattleCLI, loadBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI dispatcher invariants", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("routes transition intents through battle instance dispatchIntent", async () => {
    const dispatchIntentSpy = vi.fn().mockResolvedValue({
      accepted: true,
      rejected: false
    });
    const machineDispatchSpy = vi.fn();

    await loadBattleCLI({
      createBattleInstanceFactory: () => ({
        machine: { dispatch: machineDispatchSpy },
        dispatchIntent: dispatchIntentSpy,
        init: vi.fn(async () => ({ dispatch: machineDispatchSpy })),
        dispose: vi.fn()
      })
    });

    const battleCliModule = await import("../../src/pages/battleCLI/init.js");
    await battleCliModule.init();

    battleCliModule.handleRoundOverKey("enter");
    battleCliModule.handleCooldownKey("enter");
    await battleCliModule.triggerMatchStart();

    expect(dispatchIntentSpy).toHaveBeenCalledWith("continue", undefined);
    expect(dispatchIntentSpy).toHaveBeenCalledWith("ready", undefined);
    expect(dispatchIntentSpy).toHaveBeenCalledWith("startClicked", undefined);
    expect(machineDispatchSpy).not.toHaveBeenCalled();
  });
});
