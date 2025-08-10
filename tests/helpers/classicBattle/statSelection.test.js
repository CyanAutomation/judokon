import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { STATS } from "../../../src/helpers/battleEngineFacade.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let generateRandomCardMock;

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

let getRandomJudokaMock;
let renderMock;
let JudokaCardMock;

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));
vi.mock("../../../src/components/JudokaCard.js", () => {
  renderMock = vi.fn();
  JudokaCardMock = vi.fn().mockImplementation(() => ({ render: renderMock }));
  return { JudokaCard: JudokaCardMock };
});

let fetchJsonMock;
vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args),
  importJsonModule: vi.fn()
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

function expectDeselected(button) {
  expect(button.classList.contains("selected")).toBe(false);
}

describe("classicBattle stat selection", () => {
  let timerSpy;
  let store;
  let selectStat;
  let simulateOpponentStat;
  let handleStatSelection;
  let _resetForTest;
  let createBattleStore;

  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const roundResult = document.createElement("p");
    roundResult.id = "round-result";
    roundResult.setAttribute("aria-live", "polite");
    roundResult.setAttribute("aria-atomic", "true");
    document.body.append(playerCard, computerCard, header, roundResult);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_data, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => {
      const el = document.createElement("div");
      el.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      return el;
    });
  });

  beforeEach(async () => {
    document.body.innerHTML +=
      '<div id="stat-buttons" data-tooltip-id="ui.selectStat"><button data-stat="power"></button></div>';
    ({ createBattleStore, handleStatSelection, simulateOpponentStat, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    ));
    store = createBattleStore();
    _resetForTest(store);
    selectStat = async (stat) => {
      const p = handleStatSelection(store, stat);
      await vi.runAllTimersAsync();
      await p;
    };
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
  });

  it("clears selected class on stat buttons after each round", async () => {
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    await selectStat("power");
    expectDeselected(btn);
  });

  it("re-enables stat button after selection", async () => {
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    await selectStat("power");
    expectDeselected(btn);
    expect(btn.disabled).toBe(false);
  });

  it("clears inline background color with selected class", async () => {
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    btn.style.backgroundColor = "red";
    await selectStat("power");
    expectDeselected(btn);
    expect(btn.style.backgroundColor).toBe("");
  });

  it("shows tie message when values are equal", async () => {
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await selectStat("power");
    expect(document.querySelector("header #round-message").textContent).toMatch(/Tie/);
    expect(document.querySelector("header #score-display").textContent).toBe("You: 0\nOpponent: 0");
  });

  it("evaluateRound updates the score", async () => {
    const { createBattleStore, evaluateRound, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    const store = createBattleStore();
    _resetForTest(store);
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    const result = evaluateRound(store, "power");
    expect(result.message).toMatch(/win/);
    expect(document.querySelector("header #score-display").textContent).toBe("You: 1\nOpponent: 0");
  });

  it("shows stat comparison after selection", async () => {
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await selectStat("power");
    expect(document.getElementById("round-result").textContent).toBe("Power – You: 5 Opponent: 3");
  });

  it("simulateOpponentStat returns a valid stat", () => {
    const stat = simulateOpponentStat();
    expect(STATS.includes(stat)).toBe(true);
  });
});
