import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { setupClassicBattleDom } from "./utils.js";
import { createTimerNodes } from "./domUtils.js";
import { applyMockSetup } from "./mockSetup.js";
import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { waitForState } from "../../waitForState.js";

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
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;

    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const dispatchSpy = vi.spyOn(orchestrator, "dispatchBattleEvent");
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    await battleMod.startRound(store);

    await machine.dispatch("roundOver");
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    const controls = battleMod.startCooldown(store);

    timerSpy.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    await controls.ready;
    // Wait for the orchestrator to reach the expected state to avoid races
    await waitForState("waitingForPlayerAction");

    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
    const btn = document.querySelector('[data-role="next-round"]');
    expect(btn?.dataset.nextReady).toBe("true");
    expect(btn?.disabled).toBe(false);
    delete window.__NEXT_ROUND_COOLDOWN_MS;
  });

  it("transitions roundOver → cooldown → roundStart without duplicates", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mockBattleData();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    await battleMod.startRound(store);
    expect(generateRandomCardMock).toHaveBeenCalledTimes(1);

    await machine.dispatch("roundOver");
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    const controls = battleMod.startCooldown(store);
    document.querySelector('[data-role="next-round"]').click();
    await controls.ready;
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

  it.skip("schedules a 1s minimum cooldown in test mode", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const controls = battleMod.startCooldown(store);
    emitBattleEvent("battleStateChange", { to: "cooldown" });
    expect(nextButton.dataset.nextReady).toBeUndefined();
    timerSpy.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    await controls.ready;

    expect(nextButton.dataset.nextReady).toBe("true");
    expect(nextButton.disabled).toBe(false);

    setTestMode(false);
  }, 10000);
});
