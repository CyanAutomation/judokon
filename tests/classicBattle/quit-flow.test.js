import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, vi } from "vitest";

describe("Classic Battle quit flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("clicking Quit opens confirmation modal", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const battleEngine = await import("../../src/helpers/battleEngineFacade.js");
    const navUtils = await import("../../src/helpers/navUtils.js");
    const eventDispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    const eventBus = await import("../../src/helpers/classicBattle/eventBus.js");
    const battleUI = await import("../../src/helpers/battle/index.js");

    vi.spyOn(battleEngine, "quitMatch").mockReturnValue({ outcome: "quit" });
    const showResultSpy = vi.spyOn(battleUI, "showResult").mockImplementation(() => {});
    const dispatchedEvents = [];
    vi.spyOn(eventDispatcher, "dispatchBattleEvent").mockImplementation(async (eventName) => {
      dispatchedEvents.push(eventName);
    });
    vi.spyOn(eventBus, "getBattleState").mockReturnValue("interruptMatch");
    const navigateSpy = vi.spyOn(navUtils, "navigateToHome").mockImplementation(() => {});

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") {
      await mod.init();
    }

    const quit = document.getElementById("quit-button");
    expect(quit).toBeTruthy();
    quit.click();

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
    await Promise.resolve();
    await Promise.resolve();

    expect(showResultSpy).toHaveBeenCalledWith("You quit the match. You lose!");
    expect(dispatchedEvents).toEqual(["interrupt", "toLobby"]);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.id).toBe("quit-button");
    expect(confirmBtn.isConnected).toBe(false);
  });
});
