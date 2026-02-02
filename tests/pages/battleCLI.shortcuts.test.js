import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI shortcuts overlay", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(async () => {
    await cleanupBattleCLI();
    timers.cleanup();
  });

  it("pauses countdown while help panel is open and resumes on close", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();
    document.body.dataset.battleState = "roundSelect";

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    mod.startSelectionCountdown(8);
    expect(countdown.textContent).toContain("8");

    mod.showShortcutsPanel();

    // Countdown should pause and remaining time should be captured.
    expect(mod.getPausedTimes().selection).toBe(8);
    const pausedTimers = mod.getSelectionTimers();
    expect(pausedTimers.selectionTimer).toBe(null);
    expect(pausedTimers.selectionInterval).toBe(null);

    mod.hideShortcutsPanel();

    // Remaining time should be restored and displayed again.
    expect(mod.getPausedTimes().selection).toBe(null);
    const resumedTimers = mod.getSelectionTimers();
    expect(resumedTimers.selectionTimer).not.toBe(null);
    expect(countdown.textContent).toContain("Time remaining: 8");
  });
});
