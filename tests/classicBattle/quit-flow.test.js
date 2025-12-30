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

    const battleEngine = await import("../../src/helpers/battleEngineFacade.js");
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

    // Verify button exists before init
    const quitBeforeInit = document.getElementById("quit-button");
    if (!quitBeforeInit) {
      throw new Error("Quit button not found in HTML before init()");
    }

    // Patch the button to track when it's disconnected
    const originalButton = quitBeforeInit;
    let buttonDisconnected = false;
    const observer = new MutationObserver((mutations) => {
      if (!originalButton.isConnected) {
        buttonDisconnected = true;
        observer.disconnect();
        // Try to capture stack trace
        console.error("BUTTON DISCONNECTED at:", new Error().stack);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    
    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") {
      await mod.init();
    }
    
    observer.disconnect();
    
    if (buttonDisconnected) {
      throw new Error("Quit button was disconnected/replaced during init()");
    }
    
    // Verify init completed
    expect(window.__battleInitComplete).toBe(true);
    expect(window.__battleInitError).toBeUndefined();

    const quitAfterInit = document.getElementById("quit-button");
    expect(quitAfterInit).toBeTruthy();
    
    // Check if the button was replaced
    if (quitBeforeInit !== quitAfterInit) {
      throw new Error("Quit button was replaced during init() - this breaks event binding!");
    }
    
    // Check if event handler is attached
    if (!quit.__controlBound) {
      // Debug: Check if wireControlButtons was called
      const replayBtn = document.getElementById("replay-button");
      console.error("Quit button not bound:", {
        quitExists: !!quit,
        replayBound: replayBtn?.__controlBound,
        battleStoreExists: !!window.battleStore,
        initComplete: window.__battleInitComplete
      });
      throw new Error("Quit button event handler was not attached during init()");
    }
    
    quit.click();

    // Wait for the click event handler to execute and create the promise
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.quitConfirmButtonPromise).not.toBe(null);
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
