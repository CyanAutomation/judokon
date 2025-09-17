import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  showMessage: vi.fn(),
  updateScore: vi.fn(),
  clearRoundCounter: vi.fn(),
  updateRoundCounter: vi.fn()
}));
vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  handleReplay: vi.fn(),
  isOrchestrated: () => false
}));
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/uiService.js", () => ({
  syncScoreDisplay: vi.fn(),
  showMatchSummaryModal: vi.fn()
}));
vi.mock("../../../src/helpers/battle/index.js", () => ({
  resetStatButtons: vi.fn()
}));
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: () => 3
}));

vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  startTimer: vi.fn(),
  handleStatSelectionTimeout: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/selectionHandler.js", () => ({
  handleStatSelection: vi.fn(),
  validateAndApplySelection: vi.fn(),
  dispatchStatSelected: vi.fn(),
  resolveWithFallback: vi.fn(),
  syncResultDisplay: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/cardStatUtils.js", () => ({
  getCardStatValue: () => 0
}));
vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  getOpponentJudoka: () => ({ stats: {} })
}));

describe("round UI handlers", () => {
  it("calls applyRoundUI on roundStarted", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindRoundStarted();
    const { emitBattleEvent } = events;
    document.body.innerHTML =
      '<div id="player-card"></div><div id="opponent-card"></div><div id="stat-buttons"><button data-stat="power"></button></div><div id="round-result"></div>';
    const store = {};
    emitBattleEvent("roundStarted", { store, roundNumber: 2 });
    expect(store.playerCardEl).toBeTruthy();
    expect(store.statButtonEls?.power).toBeTruthy();
  });

  it("highlights selected stat button", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindStatSelected();
    const { emitBattleEvent } = events;
    document.body.innerHTML = '<div id="stat-buttons"><button data-stat="power"></button></div>';
    const btn = document.querySelector('[data-stat="power"]');
    const store = { statButtonEls: { power: btn } };
    emitBattleEvent("statSelected", { stat: "power", store });
    expect(btn.classList.contains("selected")).toBe(true);
  });

  it("shows outcome on roundResolved", async () => {
    vi.resetModules();
    globalThis.__classicBattleRoundUIBound = true;
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    const ui = await import("../../../src/helpers/classicBattle/roundUI.js");
    ui.bindRoundResolved();
    const { emitBattleEvent } = events;
    const store = {};
    emitBattleEvent("roundResolved", {
      store,
      result: { matchEnded: false, message: "Win", playerScore: 1, opponentScore: 0 }
    });
    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    expect(scoreboard.showMessage).toHaveBeenCalledWith("Win", { outcome: true });
  });
});
