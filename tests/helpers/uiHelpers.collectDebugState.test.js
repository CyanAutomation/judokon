import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { __setStateSnapshot } from "../../src/helpers/classicBattle/battleDebug.js";

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
  beforeEach(() => {
    document.body.innerHTML = '<div id="opponent-card"><div></div><div></div></div>';
    __setStateSnapshot({
      state: "idle",
      prev: "prev",
      event: "event",
      log: ["a", "b"]
    });
    Object.assign(window, {
      __roundDecisionEnter: 123,
      __guardFiredAt: 456,
      __guardOutcomeEvent: "guard",
      __getClassicBattleMachine: () => ({
        getState: () => "idle",
        statesByName: new Map([["idle", { triggers: [{ on: "start" }] }]])
      }),
      battleStore: { selectionMade: true, playerChoice: "power" },
      __buildTag: "v1",
      __roundDebug: 7,
      __eventDebug: ["x"]
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    __setStateSnapshot({ state: null, prev: null, event: null, log: [] });
    delete window.__roundDecisionEnter;
    delete window.__guardFiredAt;
    delete window.__guardOutcomeEvent;
    delete window.__getClassicBattleMachine;
    delete window.battleStore;
    delete window.__buildTag;
    delete window.__roundDebug;
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
