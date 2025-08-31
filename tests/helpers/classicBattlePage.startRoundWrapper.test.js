import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.resetModules();
  vi.doUnmock("../../src/helpers/settingsStorage.js");
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
    dispatchBattleEvent: vi.fn().mockResolvedValue()
  }));
});

describe("startRoundWrapper failures", () => {
  it("shows error message, opens retry modal, and re-enables stat buttons", async () => {
    const showMessage = vi.fn();
    const startRound = vi.fn().mockRejectedValue(new Error("fail"));
    const waitForOpponentCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: () => {} }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      setupScoreboard: vi.fn(),
      showMessage,
      updateTimer: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode: vi.fn(),
      isTestModeEnabled: () => true
    }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(false),
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/battleStateProgress.js", () => ({
      initBattleStateProgress: vi.fn().mockResolvedValue()
    }));
    vi.doMock("../../src/helpers/classicBattle/interruptHandlers.js", () => ({
      initInterruptHandlers: vi.fn()
    }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels: vi.fn() }));
    vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation: vi.fn() }));
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      STATS: [],
      setPointsToWin: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/timerService.js", () => ({
      onNextButtonClick: vi.fn(),
      getNextRoundControls: vi.fn(),
      setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
    }));
    vi.doMock("../../src/helpers/classicBattle/skipHandler.js", () => ({
      skipCurrentPhase: vi.fn()
    }));
    vi.doMock("../../src/components/Modal.js", () => ({
      createModal: (content) => {
        const element = document.createElement("div");
        element.appendChild(content);
        return { element, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
      }
    }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, opts = {}) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        Object.assign(btn, opts);
        return btn;
      }
    }));

    const container = document.createElement("div");
    container.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.disabled = true;
    container.appendChild(btn);
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    document.body.append(container, battleArea);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    const api = await setupClassicBattlePage();

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorSpy = vi.fn();
    document.addEventListener("round-start-error", errorSpy);
    await api.startRoundOverride();
    expect(errorSpy).toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith("Round start error. Please retry.");
    expect(btn.disabled).toBe(false);
    document.removeEventListener("round-start-error", errorSpy);
    consoleError.mockRestore();
    vi.doUnmock("../../src/helpers/setupScoreboard.js");
  });

  it("dispatches error when opponent card fails to render", async () => {
    const showMessage = vi.fn();
    const startRound = vi.fn().mockResolvedValue();
    const waitForOpponentCard = vi.fn().mockRejectedValue(new Error("no card"));

    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: () => {} }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      setupScoreboard: vi.fn(),
      showMessage,
      updateTimer: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode: vi.fn(),
      isTestModeEnabled: () => true
    }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(false),
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/battleStateProgress.js", () => ({
      initBattleStateProgress: vi.fn().mockResolvedValue()
    }));
    vi.doMock("../../src/helpers/classicBattle/interruptHandlers.js", () => ({
      initInterruptHandlers: vi.fn()
    }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels: vi.fn() }));
    vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation: vi.fn() }));
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      STATS: [],
      setPointsToWin: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/timerService.js", () => ({
      onNextButtonClick: vi.fn(),
      getNextRoundControls: vi.fn(),
      setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
    }));
    vi.doMock("../../src/helpers/classicBattle/skipHandler.js", () => ({
      skipCurrentPhase: vi.fn()
    }));
    vi.doMock("../../src/components/Modal.js", () => ({
      createModal: (content) => {
        const element = document.createElement("div");
        element.appendChild(content);
        return { element, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
      }
    }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, opts = {}) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        Object.assign(btn, opts);
        return btn;
      }
    }));

    const container = document.createElement("div");
    container.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.disabled = true;
    container.appendChild(btn);
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    document.body.append(container, battleArea);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    const api = await setupClassicBattlePage();

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorSpy = vi.fn();
    document.addEventListener("round-start-error", errorSpy);
    await api.startRoundOverride();
    expect(errorSpy).toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith("Round start error. Please retry.");
    expect(btn.disabled).toBe(false);
    document.removeEventListener("round-start-error", errorSpy);
    consoleError.mockRestore();
    vi.doUnmock("../../src/helpers/setupScoreboard.js");
  });
});

describe("startRoundWrapper success", () => {
  it("runs without error message", async () => {
    const showMessage = vi.fn();
    const startRound = vi.fn().mockResolvedValue();
    const waitForOpponentCard = vi.fn().mockResolvedValue();

    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: () => {} }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      setupScoreboard: vi.fn(),
      showMessage,
      updateTimer: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode: vi.fn(),
      isTestModeEnabled: () => true
    }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(false),
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/battleStateProgress.js", () => ({
      initBattleStateProgress: vi.fn().mockResolvedValue()
    }));
    vi.doMock("../../src/helpers/classicBattle/interruptHandlers.js", () => ({
      initInterruptHandlers: vi.fn()
    }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels: vi.fn() }));
    vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation: vi.fn() }));
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      STATS: [],
      setPointsToWin: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/timerService.js", () => ({
      onNextButtonClick: vi.fn(),
      getNextRoundControls: vi.fn(),
      setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms))
    }));
    vi.doMock("../../src/helpers/classicBattle/skipHandler.js", () => ({
      skipCurrentPhase: vi.fn()
    }));
    vi.doMock("../../src/components/Modal.js", () => ({
      createModal: (content) => {
        const element = document.createElement("div");
        element.appendChild(content);
        return { element, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
      }
    }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, opts = {}) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        Object.assign(btn, opts);
        return btn;
      }
    }));

    const container = document.createElement("div");
    container.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.disabled = true;
    container.appendChild(btn);
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    document.body.append(container, battleArea);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    const api = await setupClassicBattlePage();

    const errorSpy = vi.fn();
    document.addEventListener("round-start-error", errorSpy);
    await api.startRoundOverride();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(showMessage).not.toHaveBeenCalled();
    document.removeEventListener("round-start-error", errorSpy);
    vi.doUnmock("../../src/helpers/setupScoreboard.js");
  });
});
