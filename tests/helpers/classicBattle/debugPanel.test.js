import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/opponentController.js", () => ({
  getOpponentCardData: vi.fn()
}));
vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: vi.fn(),
  featureFlagsEmitter: new EventTarget()
}));
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  getScores: () => ({ player: 1, opponent: 2 }),
  getTimerState: () => ({ timeLeft: 30 }),
  isMatchEnded: () => false,
  STATS: {}
}));
vi.mock("../../../src/helpers/testModeUtils.js", () => ({
  isTestModeEnabled: () => false,
  getCurrentSeed: () => 42,
  setTestMode: vi.fn()
}));
vi.mock("../../../src/components/JudokaCard.js", () => ({ JudokaCard: vi.fn() }));
vi.mock("../../../src/helpers/lazyPortrait.js", () => ({ setupLazyPortraits: vi.fn() }));
vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({ showMessage: vi.fn() }));
vi.mock("../../../src/helpers/battle/index.js", () => ({ showResult: vi.fn() }));
vi.mock("../../../src/helpers/motionUtils.js", () => ({ shouldReduceMotionSync: () => true }));
vi.mock("../../../src/utils/scheduler.js", () => ({ onFrame: vi.fn(), cancel: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
  handleStatSelection: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  onNextButtonClick: vi.fn(),
  getNextRoundControls: vi.fn()
}));
vi.mock("../../../src/helpers/stats.js", () => ({ loadStatNames: vi.fn() }));
vi.mock("../../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation: vi.fn() }));
vi.mock("../../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels: vi.fn() }));
vi.mock("../../../src/components/Modal.js", () => ({ createModal: vi.fn() }));
vi.mock("../../../src/components/Button.js", () => ({ createButton: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/uiService.js", () => ({ syncScoreDisplay: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({ onBattleEvent: vi.fn() }));

import { updateDebugPanel } from "../../../src/helpers/classicBattle/uiHelpers.js";

describe("updateDebugPanel", () => {
  let pre;
  beforeEach(() => {
    document.body.innerHTML = '<pre id="debug-output"></pre>';
    pre = document.getElementById("debug-output");
  });

  afterEach(() => {
    delete window.__classicBattleState;
    delete window.__getClassicBattleMachine;
    vi.restoreAllMocks();
  });

  it("renders basic debug state without machine diagnostics", () => {
    updateDebugPanel();
    const output = JSON.parse(pre.textContent);
    expect(output).toMatchObject({
      player: 1,
      opponent: 2,
      timer: { timeLeft: 30 },
      matchEnded: false
    });
    expect(output.machineReady).toBeUndefined();
    expect(output.machineTriggers).toBeUndefined();
  });

  it("includes machine diagnostics when available", () => {
    window.__classicBattleState = "idle";
    window.__getClassicBattleMachine = () => ({
      getState: () => "idle",
      statesByName: new Map([["idle", { triggers: [{ on: "start" }, { on: "quit" }] }]])
    });
    updateDebugPanel();
    const output = JSON.parse(pre.textContent);
    expect(output.machineReady).toBe(true);
    expect(output.machineTriggers).toEqual(["start", "quit"]);
  });
});
