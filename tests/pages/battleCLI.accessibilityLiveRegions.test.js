import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI accessibility live regions", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(async () => {
    timers.cleanup();
    await cleanupBattleCLI();
  });

  it("announces round resolution details through the round message live region", async () => {
    const mod = await loadBattleCLI({
      autoSelect: false,
      battleStats: ["speed"],
      stats: [{ statIndex: 1, name: "Speed" }]
    });
    await mod.init();

    const roundMessage = document.getElementById("round-message");
    expect(roundMessage?.getAttribute("role")).toBe("status");
    expect(roundMessage?.getAttribute("aria-live")).toBe("polite");

    const scoreLine = document.getElementById("score-display");
    expect(scoreLine?.getAttribute("role")).toBe("status");
    expect(scoreLine?.getAttribute("aria-live")).toBe("polite");

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("round.evaluated", {
      message: "You win!",
      scores: { player: 1, opponent: 0 },
      statKey: "speed",
      playerVal: 42,
      opponentVal: 17
    });

    expect(roundMessage?.textContent).toBe("You win! (Speed – You: 42 Opponent: 17)");
    // battleCLI.html defines #score-display data attributes + value spans; dom.js updateScoreLine
    // must keep those in sync with resolved scores from round.evaluated.
    expect(scoreLine?.dataset.scorePlayer).toBe("1");
    expect(scoreLine?.dataset.scoreOpponent).toBe("0");
    const playerValue = scoreLine?.querySelector('[data-side="player"] [data-part="value"]');
    const opponentValue = scoreLine?.querySelector('[data-side="opponent"] [data-part="value"]');
    expect(playerValue?.textContent).toBe("1");
    expect(opponentValue?.textContent).toBe("0");
  });

  it("focuses the snackbar prompt when awaiting player confirmation", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const { setAutoContinue } = await import(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    setAutoContinue(false);

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("battleStateChange", { to: "roundDisplay" });

    // Verify showSnackbar was called with the correct message (snackbar is mocked in loadBattleCLI)
    const { showSnackbar } = await import("../../src/helpers/showSnackbar.js");
    expect(showSnackbar).toHaveBeenCalledWith("Press Enter to continue");

    const nextButton = document.getElementById("next-round-button");
    expect(nextButton).toBeTruthy();
    expect(nextButton?.getAttribute("aria-label")).toBe("Continue to next round");
    expect(document.activeElement).toBe(nextButton);
  });

  it("maintains countdown updates with polite live region semantics", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const countdown = document.getElementById("cli-countdown");
    expect(countdown?.getAttribute("role")).toBe("status");
    expect(countdown?.getAttribute("aria-live")).toBe("polite");

    mod.startSelectionCountdown(5);
    await timers.advanceTimersByTimeAsync(2000);

    expect(countdown?.dataset.remainingTime).toBe("3");
    expect(countdown?.textContent).toContain("Time remaining: 3");
  });
});
