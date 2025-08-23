import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { applyMockSetup } from "./mockSetup.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => {
    const id = setTimeout(() => cb(performance.now()), 16);
    return id;
  },
  onSecondTick: (cb) => {
    const id = setInterval(() => cb(performance.now()), 1000);
    return id;
  },
  cancel: (id) => {
    clearTimeout(id);
    clearInterval(id);
  },
  start: vi.fn(),
  stop: vi.fn()
}));

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;

vi.mock("../../../src/helpers/classicBattle/orchestrator.js", () => {
  let state = "roundDecision";
  const stateLog = [];
  return {
    dispatchBattleEvent: vi.fn(async (event) => {
      if (event === "evaluate") state = "processingRound";
      else if (event.startsWith("outcome=")) state = "roundOver";
      else if (event === "continue") state = "cooldown";
      else if (event === "matchPointReached") state = "matchDecision";
      stateLog.push(state);
    }),
    __reset: () => {
      state = "roundDecision";
      stateLog.length = 0;
    },
    __getStateLog: () => stateLog
  };
});

vi.mock("../../../src/helpers/classicBattle/uiService.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiService.js");
  return { syncScoreDisplay: actual.syncScoreDisplay, showMatchSummaryModal: vi.fn() };
});

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
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const roundResult = document.createElement("p");
    roundResult.id = "round-result";
    roundResult.setAttribute("aria-live", "polite");
    roundResult.setAttribute("aria-atomic", "true");
    document.body.append(playerCard, opponentCard, header, roundResult);
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
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
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
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    orchestrator.__reset();
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
    document.getElementById("opponent-card").innerHTML =
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
    const result = evaluateRound(store, "power", 5, 3);
    expect(result.message).toMatch(/win/);
    expect(result.playerScore).toBe(1);
    expect(result.opponentScore).toBe(0);
  });

  it("shows stat comparison after selection", async () => {
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await selectStat("power");
    expect(document.getElementById("round-result").textContent).toBe("Power – You: 5 Opponent: 3");
  });

  it("advances machine to cooldown after stat selection", async () => {
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await selectStat("power");
    expect(orchestrator.dispatchBattleEvent).toHaveBeenNthCalledWith(1, "evaluate");
    expect(orchestrator.dispatchBattleEvent).toHaveBeenNthCalledWith(2, "outcome=winPlayer");
    expect(orchestrator.dispatchBattleEvent).toHaveBeenNthCalledWith(3, "continue");
    const stateLog = orchestrator.__getStateLog();
    expect(stateLog.slice(0, 3)).toEqual(["processingRound", "roundOver", "cooldown"]);
  });

  it("dispatches matchPointReached when match ends", async () => {
    const { setPointsToWin } = await import("../../../src/helpers/battleEngineFacade.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    setPointsToWin(1);
    orchestrator.__reset();
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await selectStat("power");
    await selectStat("power");
    expect(orchestrator.dispatchBattleEvent).toHaveBeenNthCalledWith(1, "evaluate");
    expect(orchestrator.dispatchBattleEvent).toHaveBeenNthCalledWith(2, "outcome=winPlayer");
    expect(orchestrator.dispatchBattleEvent).toHaveBeenNthCalledWith(3, "matchPointReached");
    expect(orchestrator.__getStateLog()).toEqual(["processingRound", "roundOver", "matchDecision"]);
  });

  it("simulateOpponentStat returns a valid stat", async () => {
    const { STATS } = await import("../../../src/helpers/battleEngineFacade.js");
    const stat = simulateOpponentStat({ power: 1, speed: 1, technique: 1, kumikata: 1, newaza: 1 });
    expect(STATS.includes(stat)).toBe(true);
  });
});
