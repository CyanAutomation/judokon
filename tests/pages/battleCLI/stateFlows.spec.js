import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";

async function setupBattleCLI(options) {
  const cli = await loadBattleCLI(options);
  await cli.init();
  const uiService = await import("../../../src/helpers/classicBattle/uiService.js");
  uiService.bindUIServiceEventHandlersOnce?.();
  cli.installEventBindings?.();
  return cli;
}

function getRoundMessageText() {
  return document.getElementById("round-message")?.textContent ?? "";
}

describe("battleCLI state flows", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("reflects scoreboard messages from the event bus", async () => {
    await setupBattleCLI();
    const eventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const { emitBattleEvent } = eventsMod;
    const domMod = await import("../../../src/pages/battleCLI/dom.js");
    const { withMutedConsole } = await import("../../utils/console.js");
    const setRoundMessageSpy = await withMutedConsole(() => vi.spyOn(domMod, "setRoundMessage"));

    expect(document.getElementById("round-message")).toBeTruthy();
    expect(eventsMod.onBattleEvent).toHaveBeenCalledWith("roundResolved", expect.any(Function));
    emitBattleEvent("roundResolved", {
      result: { message: "Ready to fight", playerScore: 1, opponentScore: 0 },
      stat: "speed",
      playerVal: 5,
      opponentVal: 3
    });
    await Promise.resolve();
    expect(setRoundMessageSpy).toHaveBeenCalled();
    const message = getRoundMessageText();
    expect(message).toContain("Ready to fight");
    expect(message).toContain("You: 5");

    emitBattleEvent("roundResolved", {
      result: { message: "Another round", playerScore: 2, opponentScore: 1 },
      stat: "power",
      playerVal: 4,
      opponentVal: 2
    });
    await Promise.resolve();
    const updatedMessage = getRoundMessageText();
    expect(updatedMessage).toContain("Another round");
    expect(updatedMessage).toContain("You: 4");
    setRoundMessageSpy.mockRestore();
  });

  it("announces stat selection stalls when auto-select disabled", async () => {
    await setupBattleCLI({ autoSelect: false });
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");

    // Import the mocked showSnackbar to verify calls
    const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

    emitBattleEvent("statSelectionStalled");
    expect(showSnackbar).toHaveBeenCalledWith("Stat selection stalled. Pick a stat.");
  });

  it("updates state badge and bottom line on round transitions", async () => {
    await setupBattleCLI({ autoSelect: false });
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const uiHelpers = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    const orchestratorHandlers = await import(
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );

    // Import the mocked showSnackbar to verify calls
    const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

    uiHelpers.updateBattleStateBadge.mockClear();
    orchestratorHandlers.setAutoContinue(false);

    emitBattleEvent("battleStateChange", { from: "waiting", to: "roundDisplay" });
    expect(uiHelpers.updateBattleStateBadge).toHaveBeenCalledWith("roundDisplay");
    expect(showSnackbar).toHaveBeenCalledWith("Press Enter to continue");

    emitBattleEvent("battleStateChange", { from: "roundDisplay", to: "roundSelect" });
  });

  describe("countdown transitions", () => {
    let timers;

    beforeEach(() => {
      timers = useCanonicalTimers();
    });

    afterEach(() => {
      timers.cleanup();
    });

    it("shows countdown ticks and emits finish", async () => {
      await setupBattleCLI();
      const eventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
      const { emitBattleEvent } = eventsMod;
      const emitSpy = vi.spyOn(eventsMod, "emitBattleEvent");

      // Import the mocked showSnackbar to verify calls
      const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

      emitBattleEvent("countdownStart", { duration: 2 });
      expect(showSnackbar).toHaveBeenCalledWith("Next round in: 2");

      showSnackbar.mockClear();
      await timers.advanceTimersByTimeAsync(1000);
      expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1");

      showSnackbar.mockClear();
      await timers.advanceTimersByTimeAsync(1000);
      expect(emitSpy).toHaveBeenCalledWith("countdownFinished");
      expect(showSnackbar).toHaveBeenCalledWith("");

      emitSpy.mockRestore();
    });
  });

  it("builds play-again controls after match over and restarts on click", async () => {
    await setupBattleCLI({
      html: '<a data-testid="home-link" href="/index.html"></a>'
    });
    const log = document.getElementById("cli-verbose-log");
    if (log) {
      log.textContent = "old";
    }

    const eventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const roundManager = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { emitBattleEvent } = eventsMod;
    const startClicked = new Promise((resolve) => {
      eventsMod.onBattleEvent("startClicked", resolve);
    });

    emitBattleEvent("matchOver");
    const playAgain = document.getElementById("play-again-button");
    expect(playAgain).toBeTruthy();
    expect(document.getElementById("return-to-lobby-link")?.getAttribute("href")).toContain(
      "index.html"
    );

    playAgain?.click();
    await startClicked;

    expect(log?.textContent).toBe("");
    expect(roundManager.resetGame).toHaveBeenCalled();
  });
});
