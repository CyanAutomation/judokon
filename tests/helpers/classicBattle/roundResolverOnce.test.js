import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn(),
  onBattleEvent: vi.fn()
}));
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
  stopTimer: vi.fn(),
  getRoundsPlayed: vi.fn(() => 0),
  _resetForTest: vi.fn()
}));

describe.sequential("classicBattle round resolver once", () => {
  let timer;
  let warnSpy;
  let handleStatSelection;
  let createBattleStore;
  let _resetForTest;

  beforeEach(async () => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    timer = vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="player-card"><ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul></div>
      <div id="opponent-card"><ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul></div>
      <div id="stat-buttons"><button data-stat="power"></button></div>
    `;
    document.body.dataset.battleState = "roundDecision";
    ({ handleStatSelection, createBattleStore, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    ));
  });

  afterEach(() => {
    timer.clearAllTimers();
    warnSpy.mockRestore();
    document.body.innerHTML = "";
    delete document.body.dataset.battleState;
  });

  it("clears playerChoice after fallback resolve", async () => {
    const store = createBattleStore();
    _resetForTest(store);
    handleStatSelection(store, "power");
    expect(store.playerChoice).toBe("power");
    await vi.advanceTimersByTimeAsync(601);
    expect(store.playerChoice).toBeNull();
  });
});
