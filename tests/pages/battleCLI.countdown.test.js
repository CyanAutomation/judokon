import * as battleEvents from "../../src/helpers/classicBattle/battleEvents.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI countdown", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(async () => {
    timers.cleanup();
    await cleanupBattleCLI();
  });

  it("updates countdown and auto-selects on expiry", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.init();
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    const cd = document.getElementById("cli-countdown");
    expect(cd.dataset.remainingTime).toBe("30");
    mod.startSelectionCountdown?.(30);
    const finishSelection = mod.getSelectionFinishFn?.();
    expect(typeof finishSelection).toBe("function");
    await finishSelection?.();
    // Either the auto-select helper is invoked, or the UI shows a selection result
    const bar = document.querySelector("#snackbar-container .snackbar");
    expect(
      autoSelectStat.mock.calls.length > 0 || /You Picked:/i.test(bar?.textContent || "")
    ).toBe(true);
  });

  it("emits statSelectionStalled when auto-select disabled", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();
    const battleEventsMod = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    mod.startSelectionCountdown?.(30);
    const finishSelection = mod.getSelectionFinishFn?.();
    expect(typeof finishSelection).toBe("function");
    await finishSelection?.();
    expect(autoSelectStat).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("statSelectionStalled");
    emitSpy.mockRestore();
  });

  it("parses skipRoundCooldown query param", async () => {
    const mod = await loadBattleCLI({
      autoSelect: true,
      url: "http://localhost/?skipRoundCooldown=1"
    });
    await mod.init();
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    expect(setFlag).toHaveBeenCalledWith("skipRoundCooldown", true);
  });

  it("does not override skipRoundCooldown flag when query param missing", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.init();
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    expect(setFlag).not.toHaveBeenCalled();
  });
});
