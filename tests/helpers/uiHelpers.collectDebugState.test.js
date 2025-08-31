import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { __setStateSnapshot } from "../../src/helpers/classicBattle/battleDebug.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";

vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
  getScores: () => ({ player: 1, opponent: 2 }),
  getTimerState: () => ({ timeLeft: 30 }),
  isMatchEnded: () => false,
  STATS: {}
}));

vi.mock("../../src/helpers/testModeUtils.js", () => ({
  isTestModeEnabled: () => true,
  getCurrentSeed: () => 999,
  setTestMode: vi.fn()
}));

import { collectDebugState } from "../../src/helpers/classicBattle/uiHelpers.js";

describe("collectDebugState", () => {
  let store;
  beforeEach(() => {
    document.body.innerHTML = '<div id="opponent-card"><div></div><div></div></div>';
    __setStateSnapshot({
      state: "idle",
      prev: "prev",
      event: "event",
      log: ["a", "b"]
    });
    store = {};
    vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
      store[k] = v;
    });
    vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
    debugHooks.exposeDebugState("roundDecisionEnter", 123);
    debugHooks.exposeDebugState("guardFiredAt", 456);
    debugHooks.exposeDebugState("guardOutcomeEvent", "guard");
    debugHooks.exposeDebugState("roundDebug", 7);
    debugHooks.exposeDebugState("getClassicBattleMachine", () => ({
      getState: () => "idle",
      statesByName: new Map([["idle", { triggers: [{ on: "start" }] }]])
    }));
    Object.assign(window, {
      battleStore: { selectionMade: true, playerChoice: "power" },
      __buildTag: "v1",
      __eventDebug: ["x"]
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    __setStateSnapshot({ state: null, prev: null, event: null, log: [] });
    vi.restoreAllMocks();
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    delete window.battleStore;
    delete window.__buildTag;
    delete window.__eventDebug;
  });

  it("preserves all debug keys", () => {
    const state = collectDebugState();
    expect(state).toEqual({
      player: 1,
      opponent: 2,
      timer: { timeLeft: 30 },
      matchEnded: false,
      seed: 999,
      machineState: "idle",
      machinePrevState: "prev",
      machineLastEvent: "event",
      machineLog: ["a", "b"],
      roundDecisionEnter: 123,
      guardFiredAt: 456,
      guardOutcomeEvent: "guard",
      machineReady: true,
      machineTriggers: ["start"],
      store: { selectionMade: true, playerChoice: "power" },
      buildTag: "v1",
      round: 7,
      eventDebug: ["x"],
      dom: { opponentChildren: 2 }
    });
  });
});
