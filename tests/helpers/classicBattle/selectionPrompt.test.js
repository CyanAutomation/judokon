import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
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

let timerSpy;
let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;
let currentFlags;

beforeEach(() => {
  try {
    if (typeof window !== "undefined" && window.__disableSnackbars)
      delete window.__disableSnackbars;
  } catch {}
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

describe("classicBattle selection prompt", () => {
  it("shows selection prompt until a stat is chosen", async () => {
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const { getRoundPromptPromise } = await import("../../../src/helpers/classicBattle.js");
    await battleMod.startRound(store);
    await getRoundPromptPromise();
    expect(document.querySelector(".snackbar").textContent).toBe("Select your move");
    timerSpy.advanceTimersByTime(5000);
    expect(document.querySelector(".snackbar")).toBeNull();
    expect(document.querySelector("header #round-message").textContent).toBe("");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    {
      const playerVal = battleMod.getCardStatValue(document.getElementById("player-card"), "power");
      const opponentVal = battleMod.getCardStatValue(
        document.getElementById("opponent-card"),
        "power"
      );
      const p = battleMod.handleStatSelection(store, "power", {
        playerVal,
        opponentVal
      });
      await vi.runAllTimersAsync();
      await p;
    }
    expect(document.querySelector(".snackbar")?.textContent).not.toBe("Select your move");
  });
});
