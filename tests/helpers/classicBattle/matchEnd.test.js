import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
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

let currentFlags;
vi.mock("../../../src/helpers/featureFlags.js", () => ({
  featureFlagsEmitter: new EventTarget(),
  initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags }),
  isEnabled: (flag) => currentFlags[flag]?.enabled ?? false
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

beforeEach(() => {
  ({
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  } = setupClassicBattleDom());
});

afterEach(() => {
  timerSpy.clearAllTimers();
  vi.restoreAllMocks();
});

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
});
