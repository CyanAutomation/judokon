import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { CLASSIC_BATTLE_POINTS_TO_WIN } from "../../../src/helpers/constants.js";
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

vi.mock("../../../src/components/Modal.js", () => ({
  createModal: (content) => {
    const el = document.createElement("div");
    if (content) el.append(content);
    return { element: el, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
  },
  createButton: (text, opts = {}) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn, opts);
    return btn;
  }
}));

let timerSpy;
let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;
let currentFlags;

beforeEach(() => {
  ({
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  } = setupClassicBattleDom());
  applyMockSetup({
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  });
});

afterEach(() => {
  timerSpy.clearAllTimers();
  vi.restoreAllMocks();
});

async function playRound(battleMod, store, playerValue, opponentValue) {
  document.getElementById("player-card").innerHTML =
    `<ul><li class=\"stat\"><strong>Power</strong> <span>${playerValue}</span></li></ul>`;
  document.getElementById("opponent-card").innerHTML =
    `<ul><li class=\"stat\"><strong>Power</strong> <span>${opponentValue}</span></li></ul>`;
  store.selectionMade = false;
  await battleMod.selectStat(store, "power", { delayMs: 0, sleep: async () => {} });
}

async function playerWinsRounds(battleMod, store, count) {
  for (let i = 0; i < count; i++) {
    await playRound(battleMod, store, 5, 3);
  }
}

async function opponentWinsRounds(battleMod, store, count) {
  for (let i = 0; i < count; i++) {
    await playRound(battleMod, store, 3, 5);
  }
}

describe("classicBattle match end", () => {
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
    await playerWinsRounds(battleMod, store, CLASSIC_BATTLE_POINTS_TO_WIN);
    expect(document.querySelector("header #score-display").textContent).toBe(
      `You: ${CLASSIC_BATTLE_POINTS_TO_WIN}\nOpponent: 0`
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(/win the match/i);
  });

  it("ends the match when opponent reaches required wins", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await opponentWinsRounds(battleMod, store, CLASSIC_BATTLE_POINTS_TO_WIN);
    expect(document.querySelector("header #score-display").textContent).toBe(
      `You: 0\nOpponent: ${CLASSIC_BATTLE_POINTS_TO_WIN}`
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(
      /opponent wins the match/i
    );
  });

  it("additional stat selections after match end do not change the score", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await playerWinsRounds(battleMod, store, CLASSIC_BATTLE_POINTS_TO_WIN);
    const scoreBefore = document.querySelector("header #score-display").textContent;
    await playRound(battleMod, store, 5, 3);
    expect(document.querySelector("header #score-display").textContent).toBe(scoreBefore);
  });
});
