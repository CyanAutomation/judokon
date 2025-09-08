// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "./commonMocks.js";

let showMessage;
let clearMessage;
let clearTimer;
let showSnackbar;
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
    showAutoSelect: vi.fn()
  }));

  vi.mock("../../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: (...args) => showSnackbar(...args),
    updateSnackbar: vi.fn()
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
    getOpponentDelay: () => 0
  }));

  vi.mock("../../../src/helpers/classicBattle/opponentController.js", () => ({
    getOpponentCardData: vi.fn().mockResolvedValue(null)
  }));

  vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
    startCooldown,
    setupFallbackTimer: vi.fn((ms, cb) => setTimeout(cb, ms)),
    createBattleStore: () => ({})
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
    t: (key) => key === "ui.opponentChoosing" ? "Opponent is choosing…" : key
  }));
});

describe("classicBattle opponent delay", () => {
  it("shows snackbar during opponent delay and clears before outcome", async () => {
    const timer = vi.useFakeTimers();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const mod = await import("../../../src/helpers/classicBattle.js");
    const { setOpponentDelay } = await import("../../../src/helpers/classicBattle/snackbar.js");
    const { bindUIHelperEventHandlersDynamic } = await import("../../../src/helpers/classicBattle/uiEventHandlers.js");
    
    setOpponentDelay(0);
    vi.spyOn(mod, "simulateOpponentStat").mockReturnValue("power");
    vi.spyOn(mod, "evaluateRound").mockReturnValue({ matchEnded: false });
    const store = mod.createBattleStore();

    showSnackbar = vi.fn();
    // Bind the UI event handlers so the statSelected event is handled
    bindUIHelperEventHandlersDynamic();
    
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);
    const promise = mod.handleStatSelection(store, mod.simulateOpponentStat(), {
      playerVal: 5,
      opponentVal: 3,
      delayOpponentMessage: true
    });

    expect(showSnackbar).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(showSnackbar).toHaveBeenCalledWith("Opponent is choosing…");
    await promise;
    timer.clearAllTimers();
    randomSpy.mockRestore();
  });
});
