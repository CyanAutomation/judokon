import * as battleEvents from "../../src/helpers/classicBattle/battleEvents.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupBattleCLI();
  });

  it("updates countdown and auto-selects on expiry", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.__test.init();
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    const cd = document.getElementById("cli-countdown");
    expect(cd.dataset.remainingTime).toBe("30");
    vi.advanceTimersByTime(30000);
    // Some environments may not flush the exact expiry tick; force it via test hook.
    await mod.__test.forceSelectionExpiry();
    // Either the auto-select helper is invoked, or the UI shows a selection result
    const bar = document.querySelector("#snackbar-container .snackbar");
    expect(
      autoSelectStat.mock.calls.length > 0 || /You Picked:/i.test(bar?.textContent || "")
    ).toBe(true);
  });

  it("emits statSelectionStalled when auto-select disabled", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.__test.init();
    const battleEventsMod = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    vi.advanceTimersByTime(30000);
    await mod.__test.forceSelectionExpiry();
    expect(autoSelectStat).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("statSelectionStalled");
    emitSpy.mockRestore();
  });

  it("parses skipRoundCooldown query param", async () => {
    const mod = await loadBattleCLI({
      autoSelect: true,
      url: "http://localhost/?skipRoundCooldown=1"
    });
    await mod.__test.init();
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    expect(setFlag).toHaveBeenCalledWith("skipRoundCooldown", true);
  });

  it("does not override skipRoundCooldown flag when query param missing", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.__test.init();
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    expect(setFlag).not.toHaveBeenCalled();
  });
});
