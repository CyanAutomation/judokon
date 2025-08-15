import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { CLASSIC_BATTLE_POINTS_TO_WIN } from "../../../src/helpers/constants.js";
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

describe("classicBattle match flow", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
      }
      return [];
    });
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
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

  afterEach(() => {
    timerSpy.clearAllTimers();
  });

  it("auto-selects a stat when timer expires", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    timerSpy.advanceTimersByTime(31000);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    const msg = document.querySelector("header #round-message").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
    expect(msg).toMatch(/win the round/i);
  });

  it("quits match after confirmation", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod.quitMatch(store);
    const confirmBtn = document.getElementById("confirm-quit-button");
    expect(confirmBtn).not.toBeNull();
    confirmBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("header #round-message").textContent).toMatch(/quit/i);
  });

  it("does not quit match when cancel is chosen", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    document.querySelector("#round-message").textContent = "Ready";
    battleMod.quitMatch(store);
    const cancelBtn = document.getElementById("cancel-quit-button");
    expect(cancelBtn).not.toBeNull();
    cancelBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("header #round-message").textContent).toBe("Ready");
    expect(document.querySelector("header #score-display").textContent).toBe("You: 0\nOpponent: 0");
  });

  it("ends the match when player reaches required wins", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const selectStat = async () => {
      store.selectionMade = false;
      const p = battleMod.handleStatSelection(store, "power");
      await vi.runAllTimersAsync();
      await p;
    };
    for (let i = 0; i < CLASSIC_BATTLE_POINTS_TO_WIN; i++) {
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      document.getElementById("computer-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      await selectStat();
    }
    expect(document.querySelector("header #score-display").textContent).toBe(
      `You: ${CLASSIC_BATTLE_POINTS_TO_WIN}\nOpponent: 0`
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(/win the match/i);

    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    {
      const p = battleMod.handleStatSelection(store, "power");
      await vi.runAllTimersAsync();
      await p;
    }

    expect(document.querySelector("header #score-display").textContent).toBe(
      `You: ${CLASSIC_BATTLE_POINTS_TO_WIN}\nOpponent: 0`
    );
  });

  it("ends the match when opponent reaches required wins", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const selectStat = async () => {
      store.selectionMade = false;
      const p = battleMod.handleStatSelection(store, "power");
      await vi.runAllTimersAsync();
      await p;
    };
    for (let i = 0; i < CLASSIC_BATTLE_POINTS_TO_WIN; i++) {
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      document.getElementById("computer-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      await selectStat();
    }
    expect(document.querySelector("header #score-display").textContent).toBe(
      `You: 0\nOpponent: ${CLASSIC_BATTLE_POINTS_TO_WIN}`
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(
      /opponent wins the match/i
    );

    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    {
      const p = battleMod.handleStatSelection(store, "power");
      await vi.runAllTimersAsync();
      await p;
    }

    expect(document.querySelector("header #score-display").textContent).toBe(
      `You: 0\nOpponent: ${CLASSIC_BATTLE_POINTS_TO_WIN}`
    );
  });

  it("scheduleNextRound auto-dispatches ready after cooldown", async () => {
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-button";
    nextBtn.disabled = true;
    document.body.appendChild(nextBtn);

    // Provide required state data for orchestrator
    fetchJsonMock.mockImplementation(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
      }
      if (String(url).includes("classicBattleStates.json")) {
        return [
          {
            name: "roundOver",
            type: "initial",
            triggers: [{ on: "continue", target: "cooldown" }]
          },
          { name: "cooldown", triggers: [{ on: "ready", target: "roundStart" }] },
          {
            name: "roundStart",
            triggers: [{ on: "cardsRevealed", target: "waitingForPlayerAction" }]
          },
          { name: "waitingForPlayerAction", triggers: [] }
        ];
      }
      if (String(url).includes("judoka.json")) return [{ id: 1 }, { id: 2 }];
      if (String(url).includes("gokyo.json")) return [];
      return [];
    });

    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const dispatchSpy = vi.spyOn(orchestrator, "dispatchBattleEvent");
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    // Start first round to wire Next button
    await battleMod.startRound(store);

    machine.current = "roundOver";
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    battleMod.scheduleNextRound({ matchEnded: false });

    timerSpy.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
  });

  it("shows selection prompt until a stat is chosen", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    expect(document.querySelector(".snackbar").textContent).toBe("Select your move");
    timerSpy.advanceTimersByTime(5000);
    expect(document.querySelector(".snackbar")).toBeNull();
    expect(document.querySelector("header #round-message").textContent).toBe("");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    {
      const p = battleMod.handleStatSelection(store, "power");
      await vi.runAllTimersAsync();
      await p;
    }
    expect(document.querySelector(".snackbar")?.textContent).not.toBe("Select your move");
  });
});
