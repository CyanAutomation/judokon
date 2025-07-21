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

describe("classicBattle stat selection", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_data, _g, container, _pm, cb) => {
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

  it("clears selected class on stat buttons after each round", async () => {
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    const { handleStatSelection, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    await handleStatSelection("power");
    expect(btn.classList.contains("selected")).toBe(false);
  });

  it("re-enables stat button after selection", async () => {
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    const { handleStatSelection, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    await handleStatSelection("power");
    await vi.runAllTimersAsync();
    expect(btn.classList.contains("selected")).toBe(false);
    expect(btn.disabled).toBe(false);
  });

  it("clears inline background color with selected class", async () => {
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    const { handleStatSelection, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    btn.style.backgroundColor = "red";
    await handleStatSelection("power");
    await vi.runAllTimersAsync();
    expect(btn.classList.contains("selected")).toBe(false);
    expect(btn.style.backgroundColor).toBe("");
  });

  it("shows tie message when values are equal", async () => {
    const { handleStatSelection, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    _resetForTest();
    await handleStatSelection("power");
    expect(document.querySelector("header #round-message").textContent).toMatch(/Tie/);
    expect(document.querySelector("header #score-display").textContent).toBe("You: 0\nComputer: 0");
  });

  it("evaluateRound updates the score", async () => {
    const { evaluateRound, _resetForTest } = await import("../../../src/helpers/classicBattle.js");
    _resetForTest();
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    const result = evaluateRound("power");
    expect(result.message).toMatch(/win/);
    expect(document.querySelector("header #score-display").textContent).toBe("You: 1\nComputer: 0");
  });
});
