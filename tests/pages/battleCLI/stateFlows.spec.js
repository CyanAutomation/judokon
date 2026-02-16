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
    expect(eventsMod.onBattleEvent).toHaveBeenCalledWith("round.evaluated", expect.any(Function));
    emitBattleEvent("round.evaluated", {
      message: "Ready to fight",
      scores: { player: 1, opponent: 0 },
      statKey: "speed",
      playerVal: 5,
      opponentVal: 3
    });
    await Promise.resolve();
    expect(setRoundMessageSpy).toHaveBeenCalled();
    const message = getRoundMessageText();
    expect(message).toContain("Ready to fight");
    expect(message).toContain("You: 5");

    emitBattleEvent("round.evaluated", {
      message: "Another round",
      scores: { player: 2, opponent: 1 },
      statKey: "power",
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

    it("renders cooldown countdown from authoritative tick/finish events", async () => {
      await setupBattleCLI();
      const eventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
      const { emitBattleEvent } = eventsMod;

      // Import the mocked showSnackbar to verify calls
      const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

      emitBattleEvent("countdownStart", { duration: 2 });
      expect(showSnackbar).toHaveBeenCalledWith("Next round in: 2");

      showSnackbar.mockClear();
      emitBattleEvent("cooldown.timer.tick", { remainingMs: 1000 });
      expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1");

      showSnackbar.mockClear();
      emitBattleEvent("countdownFinished");
      expect(showSnackbar).toHaveBeenCalledWith("");
    });

    it("does not locally expire countdown at boundary without authoritative finish", async () => {
      await setupBattleCLI();
      const eventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
      const { emitBattleEvent } = eventsMod;
      const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

      emitBattleEvent("countdownStart", { duration: 1 });
      showSnackbar.mockClear();

      await timers.advanceTimersByTimeAsync(1500);
      expect(showSnackbar).not.toHaveBeenCalledWith("");

      emitBattleEvent("cooldown.timer.tick", { remainingMs: 0 });
      expect(showSnackbar).toHaveBeenCalledWith("");
    });

    it("uses authoritative countdown state across visibility pause/resume", async () => {
      await setupBattleCLI();
      const eventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
      const { emitBattleEvent } = eventsMod;
      const { showSnackbar } = await import("../../../src/helpers/showSnackbar.js");

      emitBattleEvent("countdownStart", { duration: 3 });
      emitBattleEvent("cooldown.timer.tick", { remainingMs: 2000 });
      showSnackbar.mockClear();

      const hiddenSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
      hiddenSpy.mockRestore();

      const visibleSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
      visibleSpy.mockRestore();

      expect(showSnackbar).toHaveBeenCalledWith("Next round in: 2");

      showSnackbar.mockClear();
      emitBattleEvent("countdownFinished");
      expect(showSnackbar).toHaveBeenCalledWith("");
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
