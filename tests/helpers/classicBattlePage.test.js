import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBattleHeader } from "../utils/testUtils.js";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.resetModules();
  vi.doUnmock("../../src/helpers/settingsStorage.js");
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn(),
    dispatchBattleEvent: vi.fn().mockResolvedValue()
  }));
});

describe("classicBattlePage stat button interactions", () => {
  it("activates stat buttons via click and keyboard", async () => {
    const startRound = vi.fn();
    const waitForOpponentCard = vi.fn();
    const handleStatSelection = vi.fn();
    const store = {};
    const loadSettings = vi.fn().mockResolvedValue({ featureFlags: {} });
    const initTooltips = vi.fn().mockResolvedValue(() => {});
    const setTestMode = vi.fn();
    const showSnackbar = vi.fn();

    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => store,
      startRound
    }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }, { name: "Speed" }, { name: "Technique" }]
    }));

    const container = document.createElement("div");
    container.id = "stat-buttons";
    ["power", "speed", "technique"].forEach((stat) => {
      const b = document.createElement("button");
      b.dataset.stat = stat;
      container.appendChild(b);
    });
    document.body.appendChild(container);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const [first, second, third] = container.querySelectorAll("button");

    container.querySelectorAll("button").forEach((b) => {
      b.disabled = false;
      b.tabIndex = 0;
    });

    first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    expect(handleStatSelection).toHaveBeenCalledWith(store, "power");
    expect(showSnackbar).toHaveBeenCalledWith("You Picked: Power");

    container.querySelectorAll("button").forEach((b) => {
      b.disabled = false;
      b.tabIndex = 0;
    });
    handleStatSelection.mockClear();
    showSnackbar.mockClear();

    second.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await Promise.resolve();
    expect(handleStatSelection).toHaveBeenCalledWith(store, "speed");
    expect(showSnackbar).toHaveBeenCalledWith("You Picked: Speed");

    container.querySelectorAll("button").forEach((b) => {
      b.disabled = false;
      b.tabIndex = 0;
    });
    handleStatSelection.mockClear();
    showSnackbar.mockClear();

    third.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await Promise.resolve();
    expect(handleStatSelection).toHaveBeenCalledWith(store, "technique");
    expect(showSnackbar).toHaveBeenCalledWith("You Picked: Technique");
  });

  it("navigates to Next Round and Quit buttons", async () => {
    const startRound = vi.fn();
    const waitForOpponentCard = vi.fn();
    const handleStatSelection = vi.fn();
    const store = {};
    const loadSettings = vi.fn().mockResolvedValue({ featureFlags: {} });
    const initTooltips = vi.fn().mockResolvedValue(() => {});
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => store,
      startRound
    }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }]
    }));

    const stats = document.createElement("div");
    stats.id = "stat-buttons";
    const statBtn = document.createElement("button");
    statBtn.dataset.stat = "power";
    stats.appendChild(statBtn);

    const next = document.createElement("button");
    next.id = "next-button";
    const quit = document.createElement("button");
    quit.id = "quit-match-button";
    document.body.append(stats, next, quit);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const focusOrder = () =>
      Array.from(document.querySelectorAll("button")).filter(
        (el) => !el.disabled && el.tabIndex !== -1
      );

    const tab = () => {
      const order = focusOrder();
      const idx = order.indexOf(document.activeElement);
      const nextEl = order[idx + 1];
      nextEl?.focus();
    };

    statBtn.focus();
    tab();
    expect(document.activeElement).toBe(next);
    tab();
    expect(document.activeElement).toBe(quit);
  });

  it("does not invoke round select modal directly", async () => {
    const initRoundSelectModal = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
      initRoundSelectModal
    }));
    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();
    expect(initRoundSelectModal).not.toHaveBeenCalled();
  });
});

describe("classicBattlePage stat help tooltip", () => {
  it("shows tooltip only once", async () => {
    vi.useFakeTimers();

    const help = document.createElement("button");
    help.id = "stat-help";
    document.body.appendChild(help);
    const spy = vi.spyOn(help, "dispatchEvent");

    const { maybeShowStatHint } = await import("../../src/helpers/classicBattle/uiHelpers.js");

    maybeShowStatHint(0);
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0].type).toBe("mouseenter");
    expect(spy.mock.calls[1][0].type).toBe("mouseleave");
    expect(localStorage.getItem("statHintShown")).toBe("true");

    spy.mockClear();
    maybeShowStatHint(0);
    vi.runAllTimers();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("classicBattlePage test mode flag", () => {
  it("applies data attribute and banner visibility when enabled", async () => {
    const startRound = vi.fn();
    const waitForOpponentCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: {
        enableTestMode: {
          enabled: true,
          label: "Test Mode",
          description: "Deterministic card draws for testing"
        }
      }
    });
    const initTooltips = vi.fn().mockResolvedValue(() => {});
    const setTestMode = vi.fn();

    const store = {};
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => store,
      startRound
    }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const banner = document.createElement("div");
    banner.id = "test-mode-banner";
    banner.className = "hidden";
    document.body.append(battleArea, banner);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    expect(battleArea.dataset.testMode).toBe("true");
    expect(banner.classList.contains("hidden")).toBe(false);
    expect(setTestMode).toHaveBeenCalledWith(true);
  });

  it("feature flag changes update banner and data attribute", async () => {
    const startRound = vi.fn();
    const waitForOpponentCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: {
        enableTestMode: { enabled: false }
      }
    });
    const updateSetting = vi
      .fn()
      .mockResolvedValue({ featureFlags: { enableTestMode: { enabled: true } } });
    const initTooltips = vi.fn().mockResolvedValue(() => {});
    const setTestMode = vi.fn();

    const store = {};
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => store,
      startRound
    }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ updateSetting }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const banner = document.createElement("div");
    banner.id = "test-mode-banner";
    banner.className = "hidden";
    document.body.append(battleArea, banner);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    await setupClassicBattlePage();

    expect(battleArea.dataset.testMode).toBe("false");
    expect(banner.classList.contains("hidden")).toBe(true);

    await setFlag("enableTestMode", true);

    expect(battleArea.dataset.testMode).toBe("true");
    expect(banner.classList.contains("hidden")).toBe(false);
  });

  it("toggles snackbar availability when test mode is toggled", async () => {
    const startRound = vi.fn();
    const waitForOpponentCard = vi.fn();

    let currentSettings = {
      featureFlags: {
        enableTestMode: { enabled: false }
      }
    };

    const loadSettings = vi.fn().mockImplementation(async () => {
      return JSON.parse(JSON.stringify(currentSettings));
    });

    const updateSetting = vi.fn().mockImplementation(async (key, value) => {
      currentSettings.featureFlags = value;
      return JSON.parse(JSON.stringify(currentSettings));
    });

    const initTooltips = vi.fn().mockResolvedValue(() => {});
    const setTestMode = vi.fn();

    const store = {};
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => store,
      startRound
    }));
    vi.doMock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
      handleStatSelection: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard }));
    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ updateSetting }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    const { setFlag } = await import("../../src/helpers/featureFlags.js");
    await setupClassicBattlePage();

    expect(window.__disableSnackbars).toBe(false);

    await setFlag("enableTestMode", true);

    expect(window.__disableSnackbars).toBe(true);

    await setFlag("enableTestMode", false);

    expect(window.__disableSnackbars).toBe(false);
  });
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
      showMessage
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode: vi.fn() }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar: vi.fn() }));
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
      STATS: []
    }));
    vi.doMock("../../src/helpers/classicBattle/timerService.js", () => ({
      onNextButtonClick: vi.fn()
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
    await setupClassicBattlePage();

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorSpy = vi.fn();
    document.addEventListener("round-start-error", errorSpy);
    await window.startRoundOverride();
    expect(errorSpy).toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith("Round start error. Please retry.");
    expect(btn.disabled).toBe(false);
    document.removeEventListener("round-start-error", errorSpy);
    consoleError.mockRestore();
    vi.doUnmock("../../src/helpers/setupScoreboard.js");
  });
});

describe("syncScoreDisplay", () => {
  it("keeps scoreboard and summary in sync", async () => {
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    const header = createBattleHeader();
    document.body.append(header);

    const getScores = vi
      .fn()
      .mockReturnValueOnce({ playerScore: 1, opponentScore: 2 })
      .mockReturnValueOnce({ playerScore: 3, opponentScore: 4 });
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores,
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn()
    }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, { id } = {}) => {
        const btn = document.createElement("button");
        if (id) btn.id = id;
        btn.textContent = label;
        return btn;
      }
    }));
    vi.doMock("../../src/components/Modal.js", () => ({
      createModal: (content) => {
        const element = document.createElement("div");
        element.className = "modal-backdrop";
        element.appendChild(content);
        return { element, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
      }
    }));
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      updateScore: (p, o) => {
        let el = document.getElementById("score-display");
        if (!el) {
          el = document.createElement("p");
          el.id = "score-display";
          document.body.appendChild(el);
        }
        el.textContent = `You: ${p}\nOpponent: ${o}`;
      }
    }));

    vi.doMock("../../src/config/loadSettings.js", () => ({
      loadSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      getSetting: () => true
    }));
    const { syncScoreDisplay, showMatchSummaryModal } = await import(
      "../../src/helpers/classicBattle/uiService.js"
    );

    syncScoreDisplay();
    const handleReplay = vi.fn();
    showMatchSummaryModal({ message: "", playerScore: 1, opponentScore: 2 }, handleReplay);
    let board = document.getElementById("score-display").textContent;
    let summary = document.querySelector(".modal-backdrop #match-summary-score").textContent;
    let match = board.match(/You: (\d+)\nOpponent: (\d+)/);
    expect(summary).toBe(`Final Score – You: ${match[1]} Opponent: ${match[2]}`);
    document.getElementById("match-summary-next").click();
    expect(handleReplay).toHaveBeenCalled();

    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());

    syncScoreDisplay();
    showMatchSummaryModal({ message: "", playerScore: 3, opponentScore: 4 }, vi.fn());
    board = document.getElementById("score-display").textContent;
    summary = document.querySelector(".modal-backdrop #match-summary-score").textContent;
    match = board.match(/You: (\d+)\nOpponent: (\d+)/);
    expect(summary).toBe(`Final Score – You: ${match[1]} Opponent: ${match[2]}`);
  });
});
