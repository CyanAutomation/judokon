import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderJudokaCardMock;

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args),
  renderJudokaCard: (...args) => renderJudokaCardMock(...args)
}));

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
    nextBtn.id = "next-round-button";
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
    renderJudokaCardMock = vi.fn(async (_j, _g, container) => {
      container.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>3</span></li></ul>`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enable/disable helpers toggle button state", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    battleMod.disableNextRoundButton();
    const btn = document.getElementById("next-round-button");
    expect(btn.disabled).toBe(true);
    battleMod.enableNextRoundButton();
    expect(btn.disabled).toBe(false);
  });

  it("quit button invokes quitMatch", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    document.getElementById("quit-match-button").click();
    const confirmBtn = document.getElementById("confirm-quit-button");
    expect(confirmBtn).not.toBeNull();
    confirmBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("#round-message").textContent).toMatch(/quit/i);
    expect(window.location.href).toMatch(/(?:index\.html)?\/?$/);
  });
});
