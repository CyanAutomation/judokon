import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createRoundMessage, createTimerNodes } from "./domUtils.js";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import {
  waitingForPlayerActionEnter,
  waitingForPlayerActionExit
} from "../../../src/helpers/classicBattle/orchestratorHandlers.js";
import { ClassicBattleView } from "../../../src/helpers/classicBattle/view.js";

function mockQuitMatch() {
  const msg = document.getElementById("round-message");
  if (msg) msg.textContent = "quit";
  window.location.href = "http://localhost/index.html";
}

vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: vi.fn().mockReturnValue(false),
  featureFlagsEmitter: new EventTarget(),
  initFeatureFlags: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({ setupScoreboard: vi.fn() }));
vi.mock("../../../src/helpers/classicBattle/skipHandler.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/skipHandler.js");
  return { ...actual, skipCurrentPhase: vi.fn(), setSkipHandler: vi.fn() };
});
vi.mock("../../../src/helpers/classicBattle/interruptHandlers.js", () => ({
  initInterruptHandlers: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  onNextButtonClick: vi.fn(),
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
  return {
    ...actual,
    watchBattleOrientation: vi.fn(),
    registerRoundStartErrorHandler: vi.fn(),
    setupNextButton: actual.setupNextButton,
    applyStatLabels: vi.fn().mockResolvedValue(),
    setBattleStateBadgeEnabled: vi.fn(),
    applyBattleFeatureFlags: vi.fn(),
    maybeShowStatHint: vi.fn()
  };
});
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  initDebugPanel: vi.fn(),
  updateDebugPanel: vi.fn()
}));
vi.mock("../../../src/helpers/battleStateProgress.js", () => ({
  initBattleStateProgress: vi.fn().mockResolvedValue(null)
}));
vi.mock("../../../src/helpers/tooltip.js", () => ({ initTooltips: vi.fn().mockResolvedValue() }));
vi.mock("../../../src/helpers/setupBottomNavbar.js", () => ({}));
vi.mock("../../../src/helpers/setupDisplaySettings.js", () => ({}));
vi.mock("../../../src/helpers/setupSvgFallback.js", () => ({}));

vi.mock("../../../src/helpers/classicBattle/quitModal.js", () => ({
  quitMatch: mockQuitMatch
}));

describe("classicBattle battle control state", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    createRoundMessage();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;
    const quitBtn = document.createElement("button");
    quitBtn.id = "quit-match-button";
    quitBtn.setAttribute("data-testid", "quit-match");
    const header = document.createElement("header");
    const statButtons = document.createElement("div");
    statButtons.id = "stat-buttons";
    statButtons.innerHTML = '<button data-stat="power"></button>';
    document.body.append(quitBtn, header, statButtons);
    window.location.href = "http://localhost/src/pages/battleJudoka.html";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enable/disable helpers toggle button state", async () => {
    const { disableNextRoundButton, enableNextRoundButton } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    const btn = document.querySelector('[data-role="next-round"]');
    disableNextRoundButton();
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
    enableNextRoundButton();
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.nextReady).toBe("true");
  });

  it("resetBattleUI replaces Next button and reattaches click handler", async () => {
    const timerSvc = await import("../../../src/helpers/classicBattle/timerService.js");
    const onNextButtonClickSpy = vi.spyOn(timerSvc, 'onNextButtonClick'); // Spy on the imported mock
    const { resetBattleUI } = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    const btn = document.querySelector('[data-role="next-round"]');
    btn.dataset.nextReady = "true";
    resetBattleUI();
    const cloned = document.querySelector('[data-role="next-round"]');
    expect(cloned).not.toBe(btn);
    expect(cloned.disabled).toBe(true);
    expect(cloned.dataset.nextReady).toBeUndefined();
    cloned.dispatchEvent(new MouseEvent("click"));
    expect(onNextButtonClickSpy).toHaveBeenCalledTimes(1);
  });

  it("quit button triggers quitMatch", async () => {
    const { createBattleStore } = await import(
      "../../../src/helpers/classicBattle/roundManager.js"
    );
    const { initQuitButton } = await import("../../../src/helpers/classicBattle/quitButton.js");
    window.battleStore = createBattleStore();
    initQuitButton(window.battleStore, { quitMatch: mockQuitMatch });
    document.querySelector('[data-testid="quit-match"]').click();
    expect(document.getElementById("round-message").textContent).toBe("quit");
    expect(window.location.href).toBe("http://localhost/index.html");
  });

  it("home link invokes quitMatch", async () => {
    const header = document.querySelector("header");
    const homeLink = document.createElement("a");
    homeLink.href = "../../index.html";
    homeLink.dataset.testid = "home-link";
    header.appendChild(homeLink);

    await import("../../../src/helpers/setupClassicBattleHomeLink.js");
    const { createBattleStore } = await import(
      "../../../src/helpers/classicBattle/roundManager.js"
    );
    window.battleStore = createBattleStore();
    homeLink.click();
    expect(document.getElementById("round-message").textContent).toBe("quit");
    expect(window.location.href).toBe("http://localhost/index.html");
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

  it("triggers stat selection via keyboard hotkeys", async () => {
    const { wireStatHotkeys } = await import("../../../src/helpers/classicBattle/statButtons.js");
    const { isEnabled } = await import("../../../src/helpers/featureFlags.js");
    isEnabled.mockReturnValue(true);
    const btn = document.querySelector("#stat-buttons button");
    const clickSpy = vi.spyOn(btn, "click");
    const detach = wireStatHotkeys(document.querySelectorAll("#stat-buttons button"));
    btn.disabled = false;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    detach();
  });

  it("ignores hotkeys when feature disabled", async () => {
    const { wireStatHotkeys } = await import("../../../src/helpers/classicBattle/statButtons.js");
    const { isEnabled } = await import("../../../src/helpers/featureFlags.js");
    isEnabled.mockReturnValue(false);
    const btn = document.querySelector("#stat-buttons button");
    const clickSpy = vi.spyOn(btn, "click");
    const detach = wireStatHotkeys(document.querySelectorAll("#stat-buttons button"));
    btn.disabled = false;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).not.toHaveBeenCalled();
    detach();
  });

  it("ignores hotkeys when focus is in input", async () => {
    const { wireStatHotkeys } = await import("../../../src/helpers/classicBattle/statButtons.js");
    const { isEnabled } = await import("../../../src/helpers/featureFlags.js");
    isEnabled.mockReturnValue(true);
    const btn = document.querySelector("#stat-buttons button");
    const clickSpy = vi.spyOn(btn, "click");
    const detach = wireStatHotkeys(document.querySelectorAll("#stat-buttons button"));
    btn.disabled = false;
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).not.toHaveBeenCalled();
    detach();
  });
});
