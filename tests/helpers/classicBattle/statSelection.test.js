import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { applyMockSetup } from "./mockSetup.js";
import { playRounds as playRoundsHelper } from "./playRounds.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => {
  let state = "roundResolve";
  const stateLog = [];
  return {
    dispatchBattleEvent: vi.fn(async (event) => {
      if (event === "roundResolved") return;
      if (event === "evaluate") state = "processingRound";
      else if (event.startsWith("outcome=")) state = "roundDisplay";
      else if (event === "continue") state = "roundWait";
      else if (event === "matchPointReached") state = "matchDecision";
      stateLog.push(state);
    }),
    __reset: () => {
      state = "roundResolve";
      stateLog.length = 0;
    },
    __getStateLog: () => stateLog
  };
});

vi.mock("../../../src/helpers/classicBattle/uiService.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiService.js");
  return {
    ...actual
  };
});

vi.mock("../../../src/helpers/classicBattle/matchSummaryModal.js", () => ({
  showMatchSummaryModal: vi.fn()
}));

function expectDeselected(button) {
  expect(button.classList.contains("selected")).toBe(false);
}

describe("classicBattle stat selection", () => {
  let timers;
  let store;
  let selectStat;
  let simulateOpponentStat;
  let handleStatSelection;
  let _resetForTest;
  let createBattleStore;
  let getCardStatValue;

  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const roundResult = document.createElement("p");
    roundResult.id = "round-result";
    roundResult.setAttribute("aria-live", "polite");
    roundResult.setAttribute("aria-atomic", "true");
    document.body.append(playerCard, opponentCard, header, roundResult);
    timers = useCanonicalTimers();
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
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    ({
      createBattleStore,
      handleStatSelection,
      simulateOpponentStat,
      _resetForTest,
      getCardStatValue
    } = await initClassicBattleTest({ afterMock: true }));
    store = createBattleStore();
    _resetForTest(store);
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    eventDispatcher.__reset();
    selectStat = async (stat) => {
      const playerVal = getCardStatValue(document.getElementById("player-card"), stat);
      const opponentVal = getCardStatValue(document.getElementById("opponent-card"), stat);
      const p = handleStatSelection(store, stat, { playerVal, opponentVal });
      await vi.runAllTimersAsync();
      await p;
    };
  });

  async function playRounds(times) {
    await playRoundsHelper(selectStat, times);
  }

  afterEach(() => {
    timers.cleanup();
  });

  it("resets stat button state after selection", async () => {
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    btn.style.backgroundColor = "red";
    await selectStat("power");
    expectDeselected(btn);
    expect(btn.disabled).toBe(false);
    expect(btn.style.backgroundColor).toBe("");
  });

  function readScore() {
    const player = document.querySelector(
      'header #score-display [data-side="player"] [data-part="value"]'
    );
    const opponent = document.querySelector(
      'header #score-display [data-side="opponent"] [data-part="value"]'
    );
    return {
      player: player ? player.textContent : null,
      opponent: opponent ? opponent.textContent : null
    };
  }

  describe.each([
    {
      playerValue: 3,
      opponentValue: 3,
      expectedMessage: /Tie/,
      expectedScore: { player: "0", opponent: "0" }
    },
    {
      playerValue: 5,
      opponentValue: 3,
      expectedMessage: /You win the round/,
      expectedScore: { player: "1", opponent: "0" }
    },
    {
      playerValue: 3,
      opponentValue: 5,
      expectedMessage: /Opponent wins the round/,
      expectedScore: { player: "0", opponent: "1" }
    }
  ])(
    "handles outcome when player=$playerValue and opponent=$opponentValue",
    ({ playerValue, opponentValue, expectedMessage, expectedScore }) => {
      it("updates message and score", async () => {
        _resetForTest(store);
        document.getElementById("player-card").innerHTML =
          `<ul><li class="stat"><strong>Power</strong> <span>${playerValue}</span></li></ul>`;
        document.getElementById("opponent-card").innerHTML =
          `<ul><li class="stat"><strong>Power</strong> <span>${opponentValue}</span></li></ul>`;
        await selectStat("power");
        expect(document.querySelector("header #round-message").textContent).toMatch(
          expectedMessage
        );
        expect(readScore()).toEqual(expectedScore);
      });
    }
  );

  it("stat selection disables buttons and updates round message", async () => {
    document.getElementById("stat-buttons").innerHTML = `
      <button data-stat="power">Power</button>
      <button data-stat="speed">Speed</button>
    `;
    const buttons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    store.statButtonEls = Object.fromEntries(
      buttons.map((button) => [button.dataset.stat, button])
    );
    const { setupUIBindings } = await import(
      "../../../src/helpers/classicBattle/setupUIBindings.js"
    );
    const view = {
      controller: { battleStore: store, timerControls: {} },
      applyBattleOrientation: () => {}
    };
    const controls = await setupUIBindings(view);
    emitBattleEvent("statButtons:enable");
    expect(buttons.every((button) => !button.disabled)).toBe(true);

    emitBattleEvent("statSelected", { stat: "power", store });
    await timers.runAllTimersAsync();
    expect(store.statButtonEls.power.classList.contains("selected")).toBe(true);
    expect(buttons.every((button) => button.disabled)).toBe(true);

    emitBattleEvent("roundResolved", {
      store,
      result: { matchEnded: false, message: "You win the round!", playerScore: 1, opponentScore: 0 }
    });
    await timers.runAllTimersAsync();
    expect(document.querySelector("header #round-message").textContent).toMatch(/win the round/i);

    controls?.disable?.();
  });

  it("advances machine to cooldown after stat selection", async () => {
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await selectStat("power");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(1, "statSelected");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(2, "evaluate");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(3, "outcome=winPlayer");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(4, "continue");
    const stateLog = eventDispatcher.__getStateLog();
    expect(stateLog.slice(0, 4)).toEqual([
      "roundResolve",
      "processingRound",
      "roundDisplay",
      "roundWait"
    ]);
  });

  it.each([
    {
      description: "player wins match",
      pointsToWin: 1,
      playerStat: 5,
      opponentStat: 3,
      outcome: "winPlayer",
      rounds: 2
    },
    {
      description: "opponent wins match",
      pointsToWin: 1,
      playerStat: 3,
      opponentStat: 5,
      outcome: "winOpponent",
      rounds: 1
    }
  ])(
    "dispatches matchPointReached when $description",
    async ({ pointsToWin, playerStat, opponentStat, outcome, rounds }) => {
      const { setPointsToWin } = await import("../../../src/helpers/BattleEngine.js");
      const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
      setPointsToWin(pointsToWin);
      eventDispatcher.__reset();
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>${playerStat}</span></li></ul>`;
      document.getElementById("opponent-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>${opponentStat}</span></li></ul>`;

      await playRounds(rounds);

      expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(1, "statSelected");
      expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(2, "evaluate");
      expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(3, `outcome=${outcome}`);
      expect(eventDispatcher.dispatchBattleEvent).toHaveBeenNthCalledWith(4, "matchPointReached");
      expect(eventDispatcher.__getStateLog()).toEqual([
        "roundResolve",
        "processingRound",
        "roundDisplay",
        "matchDecision"
      ]);
    }
  );

  it("simulateOpponentStat returns a valid stat", async () => {
    const { STATS } = await import("../../../src/helpers/BattleEngine.js");
    const stat = simulateOpponentStat({ power: 1, speed: 1, technique: 1, kumikata: 1, newaza: 1 });
    expect(STATS.includes(stat)).toBe(true);
  });
});
