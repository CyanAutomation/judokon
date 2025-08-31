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

describe("classicBattle auto select", () => {
  it("auto-selects a stat when timer expires", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    const pending = battleMod.__triggerRoundTimeoutNow(store);
    await vi.runAllTimersAsync();
    await pending;
    const score = document.querySelector("header #score-display").textContent;
    const msg = document.querySelector("header #round-message").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
    // Ensure we surfaced the win message; cooldown drift hints must not overwrite it
    expect(msg).toMatch(/win the round/i);
  });

  it("does not auto-select when feature flag disabled", async () => {
    currentFlags.autoSelect.enabled = false;
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    await vi.advanceTimersByTimeAsync(30000);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).toBe("You: 0\nOpponent: 0");
  });
});
