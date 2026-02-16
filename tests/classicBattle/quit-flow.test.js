// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, vi } from "vitest";

// Defer reading HTML file until after jsdom is setup
let htmlContent;
function getHtmlContent() {
  if (!htmlContent) {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return htmlContent;
}

describe("Classic Battle quit flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("clicking Quit opens confirmation modal", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const battleEngine = await import("../../src/helpers/BattleEngine.js");
    const navUtils = await import("../../src/helpers/navUtils.js");
    const eventDispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    const eventBus = await import("../../src/helpers/classicBattle/eventBus.js");
    const endModal = await import("../../src/helpers/classicBattle/endModal.js");

    vi.spyOn(battleEngine, "quitMatch").mockReturnValue({
      outcome: "quit",
      playerScore: 0,
      opponentScore: 0
    });
    const showEndModalSpy = vi.spyOn(endModal, "showEndModal").mockImplementation(() => {});
    const dispatchedEvents = [];
    vi.spyOn(eventDispatcher, "dispatchBattleEvent").mockImplementation(async (eventName) => {
      dispatchedEvents.push(eventName);
    });
    vi.spyOn(eventBus, "getBattleState").mockReturnValue("interruptMatch");
    const navigateSpy = vi.spyOn(navUtils, "navigateToHome");
    const navComplete = new Promise((resolve) => {
      navigateSpy.mockImplementation(() => {
        resolve();
      });
    });

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    // TIMING ASSERTION: Capture quit button BEFORE init
    // Note: Button element WILL be replaced during init (via resetBattleUI/game:reset-ui event)
    const quitButtonBefore = document.getElementById("quit-button");
    expect(quitButtonBefore).toBeTruthy();

    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") {
      await mod.init();
    }

    // TIMING ASSERTION: Verify quit button was replaced during init (expected behavior)
    const quitButtonAfter = document.getElementById("quit-button");
    expect(quitButtonAfter).toBeTruthy();
    expect(quitButtonAfter).not.toBe(quitButtonBefore); // Button IS replaced (via resetBattleUI)

    // Delegated control routing marker is preserved on the replacement button instance.
    expect(quitButtonAfter.dataset.action).toBe("quit");

    const quit = quitButtonAfter; // Use the final button instance
    quit.click();

    // Wait for the click event handler to execute and create the promise
    await new Promise((resolve) => setTimeout(resolve, 0));

    const confirmBtn = await window.quitConfirmButtonPromise;
    expect(confirmBtn).toBeTruthy();

    const title = document.getElementById("quit-modal-title");
    expect(title?.textContent).toBe("Quit the match?");
    const desc = document.getElementById("quit-modal-desc");
    expect(desc?.textContent).toBe("Your progress will be lost.");
    const cancelBtn = document.getElementById("cancel-quit-button");
    expect(cancelBtn?.textContent).toBe("Cancel");
    expect(confirmBtn.textContent).toBe("Quit");

    const modal = confirmBtn.closest(".modal");
    expect(modal).toBeTruthy();
    expect(modal?.getAttribute("role")).toBe("dialog");
    expect(modal?.getAttribute("aria-modal")).toBe("true");
    expect(modal?.getAttribute("aria-labelledby")).toBe("quit-modal-title");
    expect(modal?.getAttribute("aria-describedby")).toBe("quit-modal-desc");

    expect(document.activeElement?.id).toBe("cancel-quit-button");

    confirmBtn.click();
    await navComplete;

    expect(showEndModalSpy).toHaveBeenCalledWith(expect.any(Object), {
      outcome: "quit",
      scores: { player: 0, opponent: 0 }
    });
    expect(dispatchedEvents).toEqual(["interrupt", "toLobby"]);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.id).toBe("quit-button");
    expect(confirmBtn.isConnected).toBe(false);
  });
});
