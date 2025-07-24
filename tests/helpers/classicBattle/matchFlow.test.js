import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

let generateRandomCardMock;

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

let getRandomJudokaMock;
let renderJudokaCardMock;

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args),
  renderJudokaCard: (...args) => renderJudokaCardMock(...args)
}));

let fetchJsonMock;
vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args)
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("classicBattle match flow", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderJudokaCardMock = vi.fn(async (_j, _g, container) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    });
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
  });

  it("auto-selects a stat when timer expires", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { startRound, _resetForTest } = await import("../../../src/helpers/classicBattle.js");
    _resetForTest();
    await startRound();
    timerSpy.advanceTimersByTime(31000);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    const msg = document.querySelector("header #round-message").textContent;
    expect(score).toBe("You: 1\nComputer: 0");
    expect(msg).toMatch(/win the round/i);
  });

  it("quits match after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { quitMatch } = await import("../../../src/helpers/classicBattle.js");
    const result = quitMatch();
    expect(confirmSpy).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(document.querySelector("header #round-message").textContent).toMatch(/quit/i);
  });

  it("ends the match when player reaches 10 wins", async () => {
    const { handleStatSelection, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    for (let i = 0; i < 10; i++) {
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      document.getElementById("computer-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      await handleStatSelection("power");
    }
    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 10\nComputer: 0"
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(/win the match/i);

    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await handleStatSelection("power");

    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 10\nComputer: 0"
    );
  });

  it("scheduleNextRound enables button and starts next round on click", async () => {
    document.body.innerHTML += '<button id="next-round-button" disabled></button>';
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    battleMod.scheduleNextRound({ matchEnded: false });
    const btn = document.getElementById("next-round-button");
    expect(btn.disabled).toBe(false);
    btn.click();
    await Promise.resolve();
    expect(btn.disabled).toBe(true);
  });

  it("shows selection prompt until a stat is chosen", async () => {
    const { startRound, handleStatSelection, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    await startRound();
    expect(document.querySelector("header #round-message").textContent).toBe("Select your move");
    timerSpy.advanceTimersByTime(5000);
    expect(document.querySelector("header #round-message").textContent).toBe("Select your move");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await handleStatSelection("power");
    expect(document.querySelector("header #round-message").textContent).not.toBe(
      "Select your move"
    );
  });
});
