import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleDom } from "./utils.js";
import { applyMockSetup } from "./mockSetup.js";

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
    await battleMod.startRound(store, battleMod.applyRoundUI);
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
