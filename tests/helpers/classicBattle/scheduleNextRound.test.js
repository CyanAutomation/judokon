import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Ensure fake timers are active before any scheduler/timer modules load.
// vi.useFakeTimers();
import "./commonMocks.js";
import { setupClassicBattleDom } from "./utils.js";
import { createTimerNodes } from "./domUtils.js";
import { applyMockSetup } from "./mockSetup.js";
// Note: battleEvents is imported where needed inside tests; avoid unused named import here.

import * as debugHooks from "../../../src/helpers/classicBattle/debugHooks.js";
// import { startCooldown } from "../../../src/helpers/classicBattle/roundManager.js";
import { cooldownEnter } from "../../../src/helpers/classicBattle/stateHandlers/cooldownEnter.js";

import { eventDispatcherMock } from "./mocks/eventDispatcher.js";

vi.mock("../../../src/helpers/CooldownRenderer.js", () => ({
  attachCooldownRenderer: vi.fn()
}));

vi.mock("../../../src/config/constants.js", () => ({
  BATTLE_EVENTS: {},
  ROUND_DURATION_SECONDS: 1,
  STAT_SELECTION_DURATION_SECONDS: 1
}));

vi.mock("../../../src/helpers/dataUtils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    importJsonModule: vi.fn(async (spec) => {
      if (spec.includes("countryCodeMapping.json")) {
        return {
          vu: { country: "Vanuatu", code: "vu", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          pt: {
            country: "Portugal",
            code: "pt",
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          },
          fr: { country: "France", code: "fr", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          jp: { country: "Japan", code: "jp", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          br: { country: "Brazil", code: "br", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          us: {
            country: "United States",
            code: "us",
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          },
          de: { country: "Germany", code: "de", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          ru: { country: "Russia", code: "ru", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          kr: {
            country: "South Korea",
            code: "kr",
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          },
          gb: {
            country: "United Kingdom",
            code: "gb",
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          },
          ca: { country: "Canada", code: "ca", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          it: { country: "Italy", code: "it", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          es: { country: "Spain", code: "es", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          nl: {
            country: "Netherlands",
            code: "nl",
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          },
          cn: { country: "China", code: "cn", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          mn: {
            country: "Mongolia",
            code: "mn",
            lastUpdated: "2025-04-23T10:00:00Z",
            active: true
          },
          ge: { country: "Georgia", code: "ge", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          bt: { country: "Bhutan", code: "bt", lastUpdated: "2025-04-23T10:00:00Z", active: true },
          jm: { country: "Jamaica", code: "jm", lastUpdated: "2025-04-23T10:00:00Z", active: true }
        };
      }
      // Fallback to actual import for other JSON modules
      return actual.importJsonModule(spec);
    })
  };
});

vi.mock("../../../src/components/StatsPanel.js", () => ({
  createStatsPanel: vi.fn(async () => {
    // Return a simple mock HTML element
    const div = document.createElement("div");
    div.className = "mock-stats-panel";
    div.textContent = "Mock Stats Panel";
    return div;
  })
}));

vi.mock("../../../src/components/JudokaCard.js", () => ({
  JudokaCard: vi.fn(() => ({
    render: vi.fn(async () => {
      const div = document.createElement("div");
      div.className = "mock-judoka-card";
      div.textContent = "Mock Judoka Card";
      return div;
    })
  }))
}));

vi.mock("../../../src/helpers/timerService.js", () => ({
  startTimer: vi.fn(async () => {
    return Promise.resolve();
  })
}));

vi.mock("../../../src/helpers/selectionHandler.js", () => ({
  handleStatSelection: vi.fn(async () => {
    return Promise.resolve();
  }),
  isOrchestratorActive: vi.fn(() => false)
}));

vi.mock("../../../src/helpers/cardStatUtils.js", () => ({
  getCardStatValue: vi.fn(() => 1) // Return a dummy value
}));

vi.mock("../../../src/helpers/battleEvents.js", async (importOriginal) => {
  // Use the real implementation so tests relying on the shared EventTarget
  // (onBattleEvent/offBattleEvent/emitBattleEvent) function correctly.
  const actual = await importOriginal();
  return {
    ...actual
  };
});

const dispatchBattleEventSpy = eventDispatcherMock.spy;

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
let orchestrator;

beforeEach(async () => {
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
  if (typeof window !== "undefined") {
    delete window.__NEXT_ROUND_EXPIRED;
  }
  dispatchBattleEventSpy.mockClear();
  orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
});

afterEach(() => {
  timerSpy.clearAllTimers();
  vi.restoreAllMocks();
  // Reset the event bus to avoid event leakage between tests
  return import("../../../src/helpers/classicBattle/battleEvents.js").then(
    ({ __resetBattleEventTarget }) => {
      __resetBattleEventTarget();
    }
  );
});

describe("classicBattle startCooldown", () => {
  function mockBattleData() {
    // Provide a minimal machine table directly via the test-only override so
    // the embedded state table uses this deterministic set.
    const minimal = [
      {
        name: "waitingForMatchStart",
        type: "initial",
        triggers: [{ on: "continue", target: "cooldown" }]
      },
      {
        name: "roundOver",
        triggers: [{ on: "continue", target: "cooldown" }]
      },
      {
        name: "cooldown",
        onEnter: cooldownEnter,
        triggers: [{ on: "ready", target: "roundStart" }]
      },
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
      if (String(url).includes("settings.schema.json")) {
        return {
          type: "object",
          properties: {
            sound: { type: "boolean" },
            motionEffects: { type: "boolean" },
            typewriterEffect: { type: "boolean" },
            tooltips: { type: "boolean" },
            showCardOfTheDay: { type: "boolean" },
            displayMode: { type: "string" },
            fullNavigationMap: { type: "boolean" },
            aiDifficulty: { type: "string" },
            tooltipIds: { type: "object" },
            gameModes: { type: "object" },
            featureFlags: { type: "object" }
          },
          required: [
            "sound",
            "motionEffects",
            "typewriterEffect",
            "tooltips",
            "showCardOfTheDay",
            "displayMode",
            "fullNavigationMap",
            "aiDifficulty",
            "tooltipIds",
            "gameModes",
            "featureFlags"
          ],
          additionalProperties: true
        };
      }
      return [];
    });
  }

  it("auto-dispatches ready after 1s cooldown", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();
    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitBattleEventSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    const battleEngineMod = await import("../../../src/helpers/battleEngineFacade.js");
    battleEngineMod.createBattleEngine();
    window.__NEXT_ROUND_COOLDOWN_MS = 1000;

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const startRoundWrapper = vi.fn(async () => {
      return await battleMod.startRound(store);
    });

    await orchestrator.initClassicBattleOrchestrator({
      store,
      startRoundWrapper,
      stateTable: globalThis.__CLASSIC_BATTLE_STATES__
    });
    const machine = orchestrator.getBattleStateMachine();
    const machineDispatchSpy = vi.spyOn(machine, "dispatch");

    await machine.dispatch("roundOver");
    expect(machine.getState()).toBe("roundOver");

    await machine.dispatch("continue");
    expect(machine.getState()).toBe("cooldown");

    await cooldownEnter(machine);

    dispatchBattleEventSpy.mockClear();

    expect(window.__cooldownEnterInvoked).toBe(true);
    expect(window.__startCooldownInvoked).toBe(true);
    const debugRead = globalThis.__classicBattleDebugRead;
    expect(typeof debugRead).toBe("function");
    expect(window.__debugExposed).toBe(true);
    expect(debugRead("startCooldownCalled")).toBe(true);

    const currentNextRound = debugRead("currentNextRound");
    expect(currentNextRound).toBeTruthy();
    expect(typeof currentNextRound?.timer?.start).toBe("function");
    expect(typeof currentNextRound?.ready?.then).toBe("function");

    const readyResolutionSpy = vi.fn();
    currentNextRound.ready.then(readyResolutionSpy);

    await vi.advanceTimersByTimeAsync(1000);
    await currentNextRound.ready;

    expect(readyResolutionSpy).toHaveBeenCalledTimes(1);
    expect(debugRead("handleNextRoundExpirationCalled")).toBe(true);
    const getterInfo = debugRead("handleNextRoundMachineGetter");
    debugHooks.exposeDebugState("latestGetterInfo", getterInfo ?? null);
    expect(getterInfo?.sourceReadDebug).toBe("function");
    const machineStateBefore = debugRead("handleNextRoundMachineState");
    const snapshotStateBefore = debugRead("handleNextRoundSnapshotState");
    expect(["cooldown", "roundOver", "roundStart", "waitingForPlayerAction", null]).toContain(
      machineStateBefore
    );
    expect(["cooldown", "roundOver", "roundStart", "waitingForPlayerAction", null]).toContain(
      snapshotStateBefore
    );
    expect(currentNextRound.readyDispatched).toBe(true);
    expect(currentNextRound.readyInFlight).toBe(false);
    expect(window.__NEXT_ROUND_EXPIRED).toBe(true);

    const emittedEvents = emitBattleEventSpy.mock.calls.map(([eventName]) => eventName);
    expect(emittedEvents).toContain("nextRoundTimerReady");

    const getReadyDispatchCalls = () =>
      machineDispatchSpy.mock.calls.filter(([eventName]) => eventName === "ready");
    expect(getReadyDispatchCalls()).toHaveLength(1);

    await vi.runAllTimersAsync();
    expect(getReadyDispatchCalls()).toHaveLength(1);

    expect(["roundStart", "waitingForPlayerAction"]).toContain(machine.getState());
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    delete window.__NEXT_ROUND_COOLDOWN_MS;
  }, 10000);

  it("transitions roundOver → cooldown → roundStart", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mockBattleData();
    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitBattleEventSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    const battleEngineMod = await import("../../../src/helpers/battleEngineFacade.js");
    battleEngineMod.createBattleEngine();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);
    const startRoundWrapper = vi.fn(async () => {
      return await battleMod.startRound(store);
    });

    await orchestrator.initClassicBattleOrchestrator({
      store,
      startRoundWrapper,
      stateTable: globalThis.__CLASSIC_BATTLE_STATES__
    });
    const machine = orchestrator.getBattleStateMachine();
    const machineDispatchSpy = vi.spyOn(machine, "dispatch");

    await machine.dispatch("roundOver");
    expect(machine.getState()).toBe("roundOver");

    await machine.dispatch("continue");
    expect(machine.getState()).toBe("cooldown");

    await cooldownEnter(machine);

    const debugRead = globalThis.__classicBattleDebugRead;
    expect(typeof debugRead).toBe("function");
    const currentNextRound = debugRead("currentNextRound");
    expect(currentNextRound).toBeTruthy();
    expect(typeof currentNextRound?.ready?.then).toBe("function");

    const readyPromise = currentNextRound.ready;
    const readyResolutionSpy = vi.fn();
    readyPromise.then(readyResolutionSpy);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTimersAsync();
    await readyPromise;

    expect(readyResolutionSpy).toHaveBeenCalledTimes(1);
    expect(debugRead("handleNextRoundExpirationCalled")).toBe(true);
    const getterInfo = debugRead("handleNextRoundMachineGetter");
    debugHooks.exposeDebugState("latestGetterInfo", getterInfo ?? null);
    expect(getterInfo?.sourceReadDebug).toBe("function");
    const machineStateBefore = debugRead("handleNextRoundMachineState");
    const snapshotStateBefore = debugRead("handleNextRoundSnapshotState");
    expect(["cooldown", "roundOver", "roundStart", "waitingForPlayerAction", null]).toContain(
      machineStateBefore
    );
    expect(["cooldown", "roundOver", "roundStart", "waitingForPlayerAction", null]).toContain(
      snapshotStateBefore
    );
    expect(currentNextRound.readyDispatched).toBe(true);
    expect(currentNextRound.readyInFlight).toBe(false);
    expect(window.__NEXT_ROUND_EXPIRED).toBe(true);

    const emittedEvents = emitBattleEventSpy.mock.calls.map(([eventName]) => eventName);
    expect(emittedEvents).toContain("nextRoundTimerReady");

    const getReadyDispatchCalls = () =>
      machineDispatchSpy.mock.calls.filter(([eventName]) => eventName === "ready");
    expect(getReadyDispatchCalls()).toHaveLength(1);

    await vi.runAllTimersAsync();
    expect(getReadyDispatchCalls()).toHaveLength(1);

    expect(["roundStart", "waitingForPlayerAction"]).toContain(machine.getState());
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    delete window.__NEXT_ROUND_COOLDOWN_MS;
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
    const uiService = await import("../../../src/helpers/classicBattle/uiService.js");
    uiService.bindUIServiceEventHandlersOnce();

    const { attachCooldownRenderer } = await import("../../../src/helpers/CooldownRenderer.js");
    attachCooldownRenderer.mockClear();

    await battleEventsMod.emitBattleEvent("countdownStart", { duration: 3 });
    await Promise.resolve();

    const events = emitSpy.mock.calls.map(([eventName]) => eventName);

    if (enabled) {
      expect(attachCooldownRenderer).not.toHaveBeenCalled();
      const countdownIndex = events.indexOf("countdownFinished");
      const roundStartIndex = events.indexOf("round.start");
      expect(countdownIndex).toBeGreaterThan(-1);
      expect(roundStartIndex).toBeGreaterThan(-1);
      expect(countdownIndex).toBeLessThan(roundStartIndex);
      expect(events).toContain("countdownFinished");
      expect(events).toContain("round.start");
    } else {
      expect(attachCooldownRenderer).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    }
  });

  it("emits countdownFinished before round.start when countdown expires", async () => {
    vi.resetModules();
    currentFlags.skipRoundCooldown = { enabled: false };
    applyMockSetup({ currentFlags });

    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEventsMod.__resetBattleEventTarget();
    const emitSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    const uiService = await import("../../../src/helpers/classicBattle/uiService.js");
    uiService.bindUIServiceEventHandlersOnce();

    const onFinished = vi.fn();
    await battleEventsMod.emitBattleEvent("countdownStart", { duration: 2, onFinished });
    await Promise.resolve();

    await vi.runAllTimersAsync();
    await Promise.resolve();
    const events = emitSpy.mock.calls.map(([eventName]) => eventName);
    const countdownIndex = events.lastIndexOf("countdownFinished");
    const roundStartIndex = events.lastIndexOf("round.start");
    expect(countdownIndex).toBeGreaterThan(-1);
    expect(roundStartIndex).toBeGreaterThan(-1);
    expect(countdownIndex).toBeLessThan(roundStartIndex);
    // Verify both events were actually emitted
    expect(events).toContain("countdownFinished");
    expect(events).toContain("round.start");
    expect(onFinished).toHaveBeenCalled();
  });

  it("schedules a 1s minimum cooldown in test mode", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();
    const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitBattleEventSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
    const battleEngineMod = await import("../../../src/helpers/battleEngineFacade.js");
    battleEngineMod.createBattleEngine();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    // orchestrator module is loaded in beforeEach
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const store = battleMod.createBattleStore();
    await resetRoundManager(store);

    // Set up orchestrator like other tests
    const startRoundWrapper = vi.fn(async () => {
      // Simulate startRound completing immediately
      return Promise.resolve({ playerJudoka: {}, opponentJudoka: {}, roundNumber: 1 });
    });
    await orchestrator.initClassicBattleOrchestrator({
      store,
      startRoundWrapper,
      stateTable: globalThis.__CLASSIC_BATTLE_STATES__
    });
    const machine = orchestrator.getBattleStateMachine();
    const machineDispatchSpy = vi.spyOn(machine, "dispatch");

    // Ensure machine is in roundOver state for the test
    await machine.dispatch("roundOver");
    expect(machine.getState()).toBe("roundOver");

    await machine.dispatch("continue");
    expect(machine.getState()).toBe("cooldown");

    const debugRead = globalThis.__classicBattleDebugRead;
    expect(typeof debugRead).toBe("function");
    const currentNextRound = debugRead("currentNextRound");
    expect(currentNextRound).toBeTruthy();
    expect(typeof currentNextRound?.ready?.then).toBe("function");
    expect(currentNextRound.readyDispatched).toBe(false);

    const readyResolutionSpy = vi.fn();
    currentNextRound.ready.then(readyResolutionSpy);

    await vi.advanceTimersByTimeAsync(999);
    expect(readyResolutionSpy).not.toHaveBeenCalled();
    expect(currentNextRound.readyDispatched).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await currentNextRound.ready;

    expect(readyResolutionSpy).toHaveBeenCalledTimes(1);
    expect(currentNextRound.readyDispatched).toBe(true);
    expect(currentNextRound.readyInFlight).toBe(false);

    const emittedEvents = emitBattleEventSpy.mock.calls.map(([eventName]) => eventName);
    expect(emittedEvents).toContain("nextRoundTimerReady");

    const getReadyDispatchCalls = () =>
      machineDispatchSpy.mock.calls.filter(([eventName]) => eventName === "ready");
    expect(getReadyDispatchCalls()).toHaveLength(1);

    await vi.runAllTimersAsync();
    expect(getReadyDispatchCalls()).toHaveLength(1);

    expect(["roundStart", "waitingForPlayerAction"]).toContain(machine.getState());
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);

    setTestMode(false);
  }, 10000);
});
