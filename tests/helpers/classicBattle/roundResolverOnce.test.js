import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn().mockResolvedValue()
}));
vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  getOpponentJudoka: vi.fn(() => null),
  _resetForTest: vi.fn()
}));
vi.mock("../../../src/helpers/api/battleUI.js", () => ({
  evaluateRound: vi.fn(() => ({
    message: "",
    matchEnded: false,
    playerScore: 1,
    opponentScore: 0,
    outcome: "winPlayer"
  })),
  chooseOpponentStat: vi.fn()
}));
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  STATS: ["power", "speed", "technique", "kumikata", "newaza"],
  // Ensure all named exports used by code under test exist on the mock.
  createBattleEngine: vi.fn(),
  stopTimer: vi.fn(),
  getRoundsPlayed: vi.fn(() => 0),
  _resetForTest: vi.fn(),
  onEngineCreated: vi.fn(() => () => {})
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  updateScore: vi.fn(),
  updateTimer: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
}));

describe.sequential("classicBattle round resolver once", () => {
  let timers;
  let warnSpy;
  let handleStatSelection;
  let createBattleStore;
  let _resetForTest;
  let getCardStatValue;
  let computeRoundResult;
  let previousOpponentDelay;
  let previousMinPromptDuration;

  beforeEach(async () => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    timers = useCanonicalTimers();
    document.body.innerHTML = `
      <div id="player-card"><ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul></div>
      <div id="opponent-card"><ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul></div>
      <div id="stat-buttons"><button data-stat="power"></button></div>
    `;
    previousMinPromptDuration = window.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    window.__MIN_OPPONENT_MESSAGE_DURATION_MS = 0;
    const snackbar = await import("../../../src/helpers/classicBattle/snackbar.js");
    previousOpponentDelay = snackbar.getOpponentDelay();
    snackbar.setOpponentDelay(0);
    const { onBattleEvent, emitBattleEvent, __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const { domStateListener } = await import(
      "../../../src/helpers/classicBattle/stateTransitionListeners.js"
    );
    __resetBattleEventTarget();
    onBattleEvent("battleStateChange", domStateListener);
    emitBattleEvent("battleStateChange", { from: null, to: "roundDecision", event: null });
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    ({
      handleStatSelection,
      createBattleStore,
      _resetForTest,
      getCardStatValue,
      computeRoundResult
    } = await initClassicBattleTest({ afterMock: true }));
  });

  afterEach(async () => {
    timers.cleanup();
    warnSpy.mockRestore();
    document.body.innerHTML = "";
    delete document.body.dataset.battleState;
    if (typeof previousMinPromptDuration === "undefined") {
      delete window.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    } else {
      window.__MIN_OPPONENT_MESSAGE_DURATION_MS = previousMinPromptDuration;
    }
    if (typeof previousOpponentDelay === "number") {
      const snackbar = await import("../../../src/helpers/classicBattle/snackbar.js");
      snackbar.setOpponentDelay(previousOpponentDelay);
    }
    vi.clearAllMocks();
  });

  it("clears playerChoice after fallback resolve", async () => {
    const store = createBattleStore();
    _resetForTest(store);
    const playerVal = getCardStatValue(document.getElementById("player-card"), "power");
    const opponentVal = getCardStatValue(document.getElementById("opponent-card"), "power");
    const selectionPromise = handleStatSelection(store, "power", {
      playerVal,
      opponentVal,
      delayOpponentMessage: false
    });
    // Wait for selection to be applied to store
    await selectionPromise.selectionAppliedPromise;
    expect(store.playerChoice).toBe("power");
    // Advance timers to trigger fallback resolution
    await vi.advanceTimersByTimeAsync(800);
    expect(store.playerChoice).toBeNull();
    await selectionPromise;
  });

  it("dispatches win path and updates scoreboard", async () => {
    const store = createBattleStore();
    _resetForTest(store);
    const { updateScore } = await import("../../../src/helpers/setupScoreboard.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const result = await computeRoundResult(store, "power", 5, 3);
    expect(result.outcome).toBe("winPlayer");
    expect(updateScore).toHaveBeenCalledWith(1, 0);
    expect(dispatchBattleEvent).toHaveBeenCalledWith("outcome=winPlayer");
  });

  it("dispatches draw path and updates scoreboard", async () => {
    const store = createBattleStore();
    _resetForTest(store);
    const { evaluateRound } = await import("../../../src/helpers/api/battleUI.js");
    vi.mocked(evaluateRound).mockReturnValueOnce({
      message: "",
      matchEnded: false,
      playerScore: 2,
      opponentScore: 2,
      outcome: "draw"
    });
    const { updateScore } = await import("../../../src/helpers/setupScoreboard.js");
    const { dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    );
    const result = await computeRoundResult(store, "power", 4, 4);
    expect(result.outcome).toBe("draw");
    expect(updateScore).toHaveBeenLastCalledWith(2, 2);
    expect(dispatchBattleEvent).toHaveBeenCalledWith("outcome=draw");
  });
});
