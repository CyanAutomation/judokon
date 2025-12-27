import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";

let showMessage;
let clearMessage;
let clearTimer;
let showSnackbar;
let updateSnackbar;
let startCooldown;
let renderOpponentCard;
let resetStatButtons;
let updateDebugPanel;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("document", { getElementById: () => null });
  showMessage = vi.fn();
  clearMessage = vi.fn();
  clearTimer = vi.fn();
  showSnackbar = vi.fn();
  updateSnackbar = vi.fn();
  startCooldown = vi.fn();
  renderOpponentCard = vi.fn();
  resetStatButtons = vi.fn();
  updateDebugPanel = vi.fn();

  vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
    showMessage,
    clearMessage,
    clearTimer,
    updateTimer: vi.fn(),
    updateScore: vi.fn(),
    showAutoSelect: vi.fn(),
    updateRoundCounter: vi.fn(),
    clearRoundCounter: vi.fn()
  }));

  vi.mock("../../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: (...args) => showSnackbar(...args),
    updateSnackbar: (...args) => updateSnackbar(...args)
  }));

  vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
    const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
    return {
      ...actual,
      renderOpponentCard,
      disableNextRoundButton: vi.fn()
    };
  });
  vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
    updateDebugPanel
  }));
  vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => ({
    showSelectionPrompt: vi.fn(),
    setOpponentDelay: vi.fn(),
    getOpponentDelay: vi.fn().mockReturnValue(300)
  }));

  vi.mock("../../../src/helpers/classicBattle/opponentController.js", () => ({
    getOpponentCardData: vi.fn().mockResolvedValue(null)
  }));

  vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
    startCooldown,
    setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms)),
    createBattleStore: () => ({}),
    handleReplay: vi.fn().mockResolvedValue(undefined),
    isOrchestrated: vi.fn(() => false)
  }));
  vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
    startTimer: vi.fn()
  }));

  vi.mock("../../../src/helpers/battle/index.js", () => ({
    resetStatButtons,
    getStatValue: vi.fn(),
    showResult: vi.fn()
  }));

  vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
    handleStatSelection: vi.fn().mockReturnValue({ outcome: "", matchEnded: false }),
    quitMatch: vi.fn(),
    pauseTimer: vi.fn(),
    stopTimer: vi.fn(),
    getScores: vi.fn().mockReturnValue({ playerScore: 0, opponentScore: 0 }),
    _resetForTest: vi.fn(),
    STATS: ["power"],
    OUTCOME: {}
  }));

  vi.mock("../../../src/helpers/i18n.js", () => ({
    t: (key) => (key === "ui.opponentChoosing" ? "Opponent is choosing…" : key)
  }));
});

describe("classicBattle opponent delay", () => {
  it("shows snackbar during opponent delay and clears before outcome", async () => {
    const timers = useCanonicalTimers();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const mod = await import("../../../src/helpers/classicBattle.js");
    const { setOpponentDelay } = await import("../../../src/helpers/classicBattle/snackbar.js");
    const { bindUIHelperEventHandlersDynamic } = await import(
      "../../../src/helpers/classicBattle/uiEventHandlers.js"
    );

    const opponentDelayMs = 300;
    setOpponentDelay(opponentDelayMs);
    vi.spyOn(mod, "simulateOpponentStat").mockReturnValue("power");
    vi.spyOn(mod, "evaluateRound").mockReturnValue({ matchEnded: false });
    const store = mod.createBattleStore();

    // Reset mocks before binding handlers
    showSnackbar.mockClear();
    updateSnackbar.mockClear();

    globalThis.window = globalThis.window ?? {};
    globalThis.window.__FF_OVERRIDES = { autoSelect: false };

    // Bind the UI event handlers with dependency injection
    bindUIHelperEventHandlersDynamic({
      updateSnackbar,
      showSnackbar
    });

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);
    const promise = mod.handleStatSelection(store, mod.simulateOpponentStat(), {
      playerVal: 5,
      opponentVal: 3,
      delayOpponentMessage: true
    });

    // The message should be shown immediately, but we need to allow for microtasks
    await Promise.resolve();

    // Verify updateSnackbar (not showSnackbar) is called immediately with the message
    expect(updateSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    expect(showSnackbar).not.toHaveBeenCalled();

    await timers.advanceTimersByTimeAsync(opponentDelayMs);
    await promise;
    timers.cleanup();
    randomSpy.mockRestore();
  });
});
