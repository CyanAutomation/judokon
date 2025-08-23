import { describe, it, expect, vi, beforeEach } from "vitest";
import { BattleStateMachine } from "../../../src/helpers/classicBattle/stateMachine.js";
import {
  waitingForPlayerActionEnter,
  waitingForPlayerActionExit
} from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { ClassicBattleView } from "../../../src/helpers/classicBattle/view.js";

vi.mock("../../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard: vi.fn() }));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({ setupScoreboard: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/quitButton.js", () => ({ initQuitButton: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({ skipCurrentPhase: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/interruptHandlers.js", () => ({
  initInterruptHandlers: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
  return {
    ...actual,
    watchBattleOrientation: vi.fn(),
    registerRoundStartErrorHandler: vi.fn(),
    setupNextButton: vi.fn(),
    applyStatLabels: vi.fn().mockResolvedValue(),
    setBattleStateBadgeEnabled: vi.fn(),
    applyBattleFeatureFlags: vi.fn(),
    initDebugPanel: vi.fn(),
    maybeShowStatHint: vi.fn()
  };
});
vi.mock("../../../src/helpers/battleStateProgress.js", () => ({
  initBattleStateProgress: vi.fn().mockResolvedValue(null)
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({ initTooltips: vi.fn().mockResolvedValue() }));
vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: vi.fn(),
  onSecondTick: vi.fn(),
  cancel: vi.fn(),
  start: vi.fn(),
  stop: vi.fn()
}));
vi.mock("../../../src/helpers/setupBottomNavbar.js", () => ({}));
vi.mock("../../../src/helpers/setupDisplaySettings.js", () => ({}));
vi.mock("../../../src/helpers/setupSvgFallback.js", () => ({}));
vi.mock("../../../src/helpers/setupClassicBattleHomeLink.js", () => ({}));

describe("classicBattle stat button state", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="stat-buttons"><button data-stat="power"></button></div>';
  });

  it("enables stat buttons only while waiting for player action", async () => {
    const view = new ClassicBattleView();
    view.controller = {
      battleStore: {},
      timerControls: {},
      isEnabled: () => false,
      addEventListener: vi.fn(),
      startRound: vi.fn()
    };
    await view.init();
    const { setupScoreboard } = await import("../../../src/helpers/setupScoreboard.js");
    expect(setupScoreboard).toHaveBeenCalledWith(view.controller.timerControls);

    const btn = document.querySelector("#stat-buttons button");
    expect(btn.disabled).toBe(true);

    const states = new Map([
      ["cooldown", { name: "cooldown", triggers: [{ on: "ready", target: "roundStart" }] }],
      [
        "roundStart",
        {
          name: "roundStart",
          triggers: [{ on: "cardsRevealed", target: "waitingForPlayerAction" }]
        }
      ],
      [
        "waitingForPlayerAction",
        {
          name: "waitingForPlayerAction",
          triggers: [{ on: "statSelected", target: "roundDecision" }]
        }
      ],
      ["roundDecision", { name: "roundDecision", triggers: [] }]
    ]);

    const machine = new BattleStateMachine(
      states,
      "cooldown",
      {
        waitingForPlayerAction: waitingForPlayerActionEnter,
        roundDecision: waitingForPlayerActionExit
      },
      {}
    );

    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");
    expect(btn.disabled).toBe(false);

    await machine.dispatch("statSelected");
    expect(btn.disabled).toBe(true);
  });
});
