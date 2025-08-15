import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;
let JudokaCardMock;

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));
vi.mock("../../../src/components/JudokaCard.js", () => {
  renderMock = vi.fn();
  JudokaCardMock = vi.fn().mockImplementation(() => ({ render: renderMock }));
  return { JudokaCard: JudokaCardMock };
});

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args),
  importJsonModule: vi.fn()
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("classicBattle button handlers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.location.href = "http://localhost/src/pages/battleJudoka.html";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-button";
    nextBtn.disabled = true;
    const quitBtn = document.createElement("button");
    quitBtn.id = "quit-match-button";
    document.body.append(playerCard, computerCard, header, nextBtn, quitBtn);
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => {
      const el = document.createElement("div");
      el.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>3</span></li></ul>`;
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enable/disable helpers toggle button state", async () => {
    const { disableNextRoundButton, enableNextRoundButton } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    disableNextRoundButton();
    const btn = document.getElementById("next-button");
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
    const clickSpy = vi.spyOn(timerSvc, "onNextButtonClick").mockImplementation(() => {});
    resetGame();
    const cloned = document.getElementById("next-button");
    expect(cloned).not.toBe(btn);
    expect(cloned.disabled).toBe(true);
    expect(cloned.dataset.nextReady).toBeUndefined();
    cloned.dispatchEvent(new MouseEvent("click"));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("quit button invokes quitMatch", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    window.battleStore = battleMod.createBattleStore();
    document.getElementById("quit-match-button").click();
    const confirmBtn = document.getElementById("confirm-quit-button");
    expect(confirmBtn).not.toBeNull();
    confirmBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("#round-message").textContent).toMatch(/quit/i);
    expect(window.location.href).toMatch(/(?:index\.html)?\/?$/);
  });

  it("home link invokes quitMatch", async () => {
    const header = document.querySelector("header");
    const homeLink = document.createElement("a");
    homeLink.href = "../../index.html";
    homeLink.dataset.testid = "home-link";
    header.appendChild(homeLink);
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const quitMod = await import("../../../src/helpers/classicBattle/quitModal.js");
    const store = (window.battleStore = battleMod.createBattleStore());
    const quitSpy = vi.spyOn(quitMod, "quitMatch");
    await import("../../../src/helpers/setupClassicBattleHomeLink.js");
    const beforeHref = window.location.href;
    homeLink.click();
    expect(window.location.href).toBe(beforeHref);
    expect(quitSpy).toHaveBeenCalledWith(store, homeLink);
    expect(window.battleStore).toBe(store);
    const confirmBtn = document.getElementById("confirm-quit-button");
    expect(confirmBtn).not.toBeNull();
    confirmBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("#round-message").textContent).toMatch(/quit/i);
    expect(window.location.href).toMatch(/(?:index\.html)?\/?$/);
  });
});
