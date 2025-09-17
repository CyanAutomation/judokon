// [TEST DEBUG] top-level

console.log("[TEST DEBUG] top-level");
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleDom } from "./utils.js";
import { createTimerNodes } from "./domUtils.js";
import { applyMockSetup } from "./mockSetup.js";
// Note: battleEvents is imported where needed inside tests; avoid unused named import here.

import { waitForState } from "../../waitForState.js";
import * as orchestrator from "../../../src/helpers/classicBattle/orchestrator.js";

vi.mock("../../../src/helpers/CooldownRenderer.js", () => ({
  attachCooldownRenderer: vi.fn()
}));

async function resetRoundManager(store) {
  const { _resetForTest } = await import("../../../src/helpers/classicBattle/roundManager.js");
  _resetForTest(store);
}

let timerSpy;
let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;
let currentFlags;

beforeEach(() => {
  console.log("[TEST DEBUG] beforeEach");
  console.log("[TEST DEBUG] before setupClassicBattleDom");
  ({
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  } = setupClassicBattleDom());
  console.log("[TEST DEBUG] after setupClassicBattleDom");
  console.log("[TEST DEBUG] before applyMockSetup");
  applyMockSetup({
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  });
  console.log("[TEST DEBUG] after applyMockSetup");
});

afterEach(() => {
  timerSpy.clearAllTimers();
  vi.restoreAllMocks();
  // Reset the event bus to avoid event leakage between tests
  const {
    __resetBattleEventTarget
  } = require("../../../src/helpers/classicBattle/battleEvents.js");
  __resetBattleEventTarget();
});

describe("classicBattle startCooldown", () => {
  function mockBattleData() {
    // Provide a minimal machine table directly via the test-only override so
    // the embedded state table uses this deterministic set.
    const minimal = [
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
    console.log("[TEST DEBUG] ENTER mockBattleData");
    globalThis.__CLASSIC_BATTLE_STATES__ = minimal;

    fetchJsonMock.mockImplementation(async (url) => {
      if (String(url).includes("gameTimers.js")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
      }
      if (String(url).includes("judoka.json")) return [{ id: 1 }, { id: 2 }];
      if (String(url).includes("gokyo.json")) return [];
      return [];
    });
  }

  it("auto-dispatches ready after 1s cooldown", async () => {
    console.log("[TEST DEBUG] ENTER it: auto-dispatches ready after 1s cooldown");
    console.log("[TEST DEBUG] Test started: auto-dispatches ready after 1s cooldown");
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();
    console.log("[TEST DEBUG] before import battleEngineFacade.js");
    const battleEngineMod = await import("../../../src/helpers/battleEngineFacade.js");
    console.log("[TEST DEBUG] after import battleEngineFacade.js");
    battleEngineMod.createBattleEngine();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;

    // orchestrator is now statically imported at the top
    console.log("[TEST DEBUG] before import eventDispatcher.js");
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    console.log("[TEST DEBUG] after import eventDispatcher.js");
    const dispatchSpy = vi.spyOn(eventDispatcher, "dispatchBattleEvent");
    console.log("[TEST DEBUG] before import classicBattle.js");
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    console.log("[TEST DEBUG] after import classicBattle.js");
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });

    console.log("[TEST DEBUG] before initClassicBattleOrchestrator");
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    console.log("[TEST DEBUG] after initClassicBattleOrchestrator");

    console.log("[TEST DEBUG] before getBattleStateMachine");
    const machine = orchestrator.getBattleStateMachine();
    console.log("[TEST DEBUG] after getBattleStateMachine", machine);

    await battleMod.startRound(store);

    await machine.dispatch("roundOver");
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    // Clear spy after manual continue call to only capture automatic ready call
    dispatchSpy.mockClear();

    // Debug: log state and machine before advancing timers

    console.log(
      "[TEST DEBUG] Before timer advance, state:",
      machine.getState(),
      "machine:",
      machine
    );
    timerSpy.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    // Debug: log when 'ready' is dispatched

    console.log("[TEST DEBUG] After timers, should dispatch 'ready'");
    // Debug: log state and machine after timer fires

    console.log(
      "[TEST DEBUG] After timer advance, state:",
      machine.getState(),
      "machine:",
      machine
    );
    // Confirm fallback timer callback executed
    expect(window.__NEXT_ROUND_EXPIRED).toBe(true);
    // Wait for the orchestrator to reach the expected state to avoid races
    await waitForState("waitingForPlayerAction");

    // Debug: log state after waitForState

    console.log("[TEST DEBUG] After waitForState, state:", machine.getState());

    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
    const btn = document.querySelector('[data-role="next-round"]');
    expect(btn?.dataset.nextReady).toBe("true");
    expect(btn?.disabled).toBe(false);
    delete window.__NEXT_ROUND_COOLDOWN_MS;
  });

  it("transitions roundOver → cooldown → roundStart without duplicates", async () => {
    console.log(
      "[TEST DEBUG] ENTER it: transitions roundOver → cooldown → roundStart without duplicates"
    );
    console.log(
      "[TEST DEBUG] Test started: transitions roundOver → cooldown → roundStart without duplicates"
    );
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mockBattleData();
    const battleEngineMod = await import("../../../src/helpers/battleEngineFacade.js");
    battleEngineMod.createBattleEngine();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    // orchestrator is now statically imported at the top
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });

    console.log("[TEST DEBUG] before initClassicBattleOrchestrator");
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    console.log("[TEST DEBUG] after initClassicBattleOrchestrator");

    console.log("[TEST DEBUG] before getBattleStateMachine");
    const machine = orchestrator.getBattleStateMachine();
    console.log("[TEST DEBUG] after getBattleStateMachine", machine);

    await battleMod.startRound(store);
    expect(generateRandomCardMock).toHaveBeenCalledTimes(1);

    await machine.dispatch("roundOver");
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    document.querySelector('[data-role="next-round"]').click();
    // Ensure state progressed before assertions
    await waitForState("waitingForPlayerAction");
    await vi.runAllTimersAsync();

    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
    expect(generateRandomCardMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { enabled: true, label: "enabled" },
    { enabled: false, label: "disabled" }
  ])("respects skipRoundCooldown when %s", async ({ enabled }) => {
    vi.resetModules();
    currentFlags.skipRoundCooldown = { enabled };
    applyMockSetup({ currentFlags });

    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEventsMod.__resetBattleEventTarget();
    const emitSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    await import("../../../src/helpers/classicBattle/uiService.js");

    const { attachCooldownRenderer } = await import("../../../src/helpers/CooldownRenderer.js");
    attachCooldownRenderer.mockClear();

    await battleEventsMod.emitBattleEvent("countdownStart", { duration: 3 });
    await Promise.resolve();

    if (enabled) {
      expect(attachCooldownRenderer).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith("countdownFinished");
    } else {
      expect(attachCooldownRenderer).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    }
  });

  it("schedules a 1s minimum cooldown in test mode", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();
    const battleEngineMod = await import("../../../src/helpers/battleEngineFacade.js");
    battleEngineMod.createBattleEngine();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    // orchestrator is now statically imported at the top
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);

    // Set up orchestrator like other tests
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    await battleMod.startRound(store);
    await machine.dispatch("roundOver");
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    expect(nextButton.dataset.nextReady).toBeUndefined();

    timerSpy.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    const btn = document.querySelector('[data-role="next-round"]');
    expect(btn?.dataset.nextReady).toBe("true");
    expect(btn?.disabled).toBe(false);

    setTestMode(false);
  }, 10000);
});
