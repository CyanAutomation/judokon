import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/quitModal.js", () => ({
  quitMatch: () => {
    const msg = document.getElementById("round-message");
    if (msg) msg.textContent = "quit";
    window.location.href = "http://localhost/index.html";
  }
}));

describe("classicBattle match controls", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="round-message"></div>
      <button id="next-button" disabled></button>
      <button id="quit-match-button"></button>
      <header></header>
    `;
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
    window.battleStore = createBattleStore();
    document.getElementById("quit-match-button").click();
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
