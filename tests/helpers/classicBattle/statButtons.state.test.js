import { describe, it, expect, vi, beforeEach } from "vitest";
import "./commonMocks.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import {
  waitingForPlayerActionEnter,
  waitingForPlayerActionExit
} from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { ClassicBattleView } from "../../../src/helpers/classicBattle/view.js";
const currentFlags = { statHotkeys: { enabled: false } };
vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
  featureFlagsEmitter: new EventTarget(),
  initFeatureFlags: vi.fn()
}));
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
vi.mock("../../../src/helpers/setupBottomNavbar.js", () => ({}));
vi.mock("../../../src/helpers/setupDisplaySettings.js", () => ({}));
vi.mock("../../../src/helpers/setupSvgFallback.js", () => ({}));
vi.mock("../../../src/helpers/setupClassicBattleHomeLink.js", () => ({}));

describe("classicBattle stat button state", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="stat-buttons"><button data-stat="power"></button></div>';
  });

  it("enables stat buttons only while waiting for player action", async () => {
    const view = new ClassicBattleView({ waitForOpponentCard: vi.fn() });
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

    const states = [
      { name: "cooldown", type: "initial", triggers: [{ on: "ready", target: "roundStart" }] },
      { name: "roundStart", triggers: [{ on: "cardsRevealed", target: "waitingForPlayerAction" }] },
      {
        name: "waitingForPlayerAction",
        triggers: [{ on: "statSelected", target: "roundDecision" }]
      },
      { name: "roundDecision", triggers: [] }
    ];

    const machine = await createStateManager(
      {
        waitingForPlayerAction: waitingForPlayerActionEnter,
        roundDecision: waitingForPlayerActionExit
      },
      {},
      undefined,
      states
    );

    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");
    expect(btn.disabled).toBe(false);

    await machine.dispatch("statSelected");
    expect(btn.disabled).toBe(true);
  });

  it("triggers stat selection via keyboard only when statHotkeys is enabled", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initStatButtons } = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    const controls = initStatButtons({});
    const btn = document.querySelector("#stat-buttons button");
    btn.disabled = false;
    const clickSpy = vi.spyOn(btn, "click");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).not.toHaveBeenCalled();

    currentFlags.statHotkeys.enabled = true;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    controls.disable();
    warn.mockRestore();
  });
});
