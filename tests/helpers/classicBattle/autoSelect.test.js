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
    let dispatchSpy;
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/classicBattle/eventDispatcher.js");
      dispatchSpy = vi.fn(actual.dispatchBattleEvent);
      return { ...actual, dispatchBattleEvent: dispatchSpy };
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    const battleMod = await initClassicBattleTest();
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    await battleMod.__triggerRoundTimeoutNow(store);
    const { getRoundResolvedPromise } = await import("../../../src/helpers/classicBattle.js");
    await getRoundResolvedPromise();
    const events = dispatchSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("timeout");
    expect(events).toContain("statSelected");
    expect(events).not.toContain("interrupt");
    const score = document.querySelector("header #score-display").textContent;
    const msg = document.querySelector("header #round-message").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
    // Ensure we surfaced the win message; cooldown drift hints must not overwrite it
    expect(msg).toMatch(/win the round/i);
  });
});
