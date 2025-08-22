import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoundMessage, createTimerNodes } from "./domUtils.js";

vi.mock("../../../src/helpers/classicBattle/quitModal.js", () => ({
  quitMatch: () => {
    const msg = document.getElementById("round-message");
    if (msg) msg.textContent = "quit";
    window.location.href = "http://localhost/index.html";
  }
}));

describe("classicBattle match controls", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    createRoundMessage();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;
    const quitBtn = document.createElement("button");
    quitBtn.id = "quit-match-button";
    const header = document.createElement("header");
    document.body.append(quitBtn, header);
    window.location.href = "http://localhost/src/pages/battleJudoka.html";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enable/disable helpers toggle button state", async () => {
    const { disableNextRoundButton, enableNextRoundButton } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    const btn = document.getElementById("next-button");
    disableNextRoundButton();
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
    enableNextRoundButton();
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.nextReady).toBe("true");
  });

  it("resetGame replaces Next button and reattaches click handler", async () => {
    const { resetGame } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const timerSvc = await import("../../../src/helpers/classicBattle/timerService.js");
    const btn = document.getElementById("next-button");
    btn.dataset.nextReady = "true";
    const spy = vi.spyOn(timerSvc, "onNextButtonClick").mockImplementation(() => {});
    resetGame();
    const cloned = document.getElementById("next-button");
    expect(cloned).not.toBe(btn);
    expect(cloned.disabled).toBe(true);
    expect(cloned.dataset.nextReady).toBeUndefined();
    cloned.dispatchEvent(new MouseEvent("click"));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("quit button triggers quitMatch", async () => {
    const { createBattleStore } = await import(
      "../../../src/helpers/classicBattle/roundManager.js"
    );
    const { initQuitButton } = await import("../../../src/helpers/classicBattle/quitButton.js");
    window.battleStore = createBattleStore();
    initQuitButton(window.battleStore);
    document.getElementById("quit-match-button").click();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById("round-message").textContent).toBe("quit");
    expect(window.location.href).toBe("http://localhost/index.html");
  });

  it("home link invokes quitMatch", async () => {
    const header = document.querySelector("header");
    const homeLink = document.createElement("a");
    homeLink.href = "../../index.html";
    homeLink.dataset.testid = "home-link";
    header.appendChild(homeLink);

    await import("../../../src/helpers/setupClassicBattleHomeLink.js");
    const { createBattleStore } = await import(
      "../../../src/helpers/classicBattle/roundManager.js"
    );
    window.battleStore = createBattleStore();
    homeLink.click();
    expect(document.getElementById("round-message").textContent).toBe("quit");
    expect(window.location.href).toBe("http://localhost/index.html");
  });
});
