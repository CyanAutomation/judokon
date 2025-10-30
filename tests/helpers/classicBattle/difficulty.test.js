import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";

vi.mock("../../../src/helpers/battleEngineFacade.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
  return {
    ...actual,
    stopTimer: vi.fn(),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
    handleStatSelection: vi.fn((playerVal, opponentVal) => ({
      delta: playerVal - opponentVal,
      outcome: playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw",
      matchEnded: false,
      playerScore: playerVal > opponentVal ? 1 : 0,
      opponentScore: playerVal < opponentVal ? 1 : 0
    }))
  };
});

vi.mock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn().mockResolvedValue(false)
}));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/promises.js", () => ({
  getRoundResolvedPromise: vi.fn(() => Promise.resolve())
}));

vi.mock("../../../src/helpers/classicBattle/timerUtils.js", () => ({
  resolveDelay: vi.fn(() => 0)
}));

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  updateScore: vi.fn(),
  clearTimer: vi.fn()
}));

vi.mock("../../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/scoreDisplay.js", () => ({
  writeScoreDisplay: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/roundStore.js", () => ({
  roundStore: { setSelectedStat: vi.fn() }
}));

vi.mock("../../../src/helpers/classicBattle/eventBus.js", () => ({
  getBattleState: vi.fn(() => null)
}));

vi.mock("../../../src/helpers/classicBattle/roundResolver.js", () => ({
  resolveRound: vi.fn(async (_store, stat, playerVal, opponentVal) => ({
    stat,
    delta: playerVal - opponentVal,
    outcome: playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw",
    matchEnded: false,
    playerScore: playerVal > opponentVal ? 1 : 0,
    opponentScore: playerVal < opponentVal ? 1 : 0
  }))
}));

describe("simulateOpponentStat difficulty", () => {
  /**
   * Probability expectations derived from 200 deterministic seeds using the
   * current sin-based RNG in `seededRandom`. Update these thresholds alongside
   * the distribution tests whenever the weighting algorithm changes so tuning
   * remains fast and intentional.
   */
  const DISTRIBUTION_SAMPLE_SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);
  const EASY_MIN_SHARE = 0.15;
  const EASY_MAX_SHARE = 0.3;
  const MEDIUM_ABOVE_AVERAGE_THRESHOLD = 0.7;

  let simulateOpponentStat;
  let handleStatSelection;
  let createBattleStore;
  let stats;
  let statKeys;
  let roundResolver;
  let setTestMode;
  let randomSpy;

  beforeEach(async () => {
    stats = { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 };
    ({ simulateOpponentStat, handleStatSelection } = await import(
      "../../../src/helpers/classicBattle/selectionHandler.js"
    ));
    ({ createBattleStore } = await import("../../../src/helpers/classicBattle/roundManager.js"));
    ({ STATS: statKeys } = await import("../../../src/helpers/battleEngineFacade.js"));
    roundResolver = await import("../../../src/helpers/classicBattle/roundResolver.js");
    ({ setTestMode } = await import("../../../src/helpers/testModeUtils.js"));
    setTestMode(false);
    roundResolver.resolveRound.mockClear();
  });

  afterEach(() => {
    if (randomSpy) {
      randomSpy.mockRestore();
      randomSpy = undefined;
    }
    if (setTestMode) {
      setTestMode(false);
    }
    vi.clearAllMocks();
  });

  function sampleChoices(difficulty, sourceStats = stats) {
    const counts = new Map();
    try {
      for (const seed of DISTRIBUTION_SAMPLE_SEEDS) {
        setTestMode({ enabled: true, seed });
        const stat = simulateOpponentStat(sourceStats, difficulty);
        counts.set(stat, (counts.get(stat) ?? 0) + 1);
      }
    } finally {
      setTestMode(false);
    }
    return counts;
  }

  it("returns a random stat on easy", () => {
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    const stat = simulateOpponentStat(stats, "easy");
    expect(statKeys.includes(stat)).toBe(true);
  });

  it("chooses among stats at or above average on medium", () => {
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.1);
    const stat = simulateOpponentStat(stats, "medium");
    expect(["technique", "kumikata", "newaza"]).toContain(stat);
  });

  it("chooses the highest stat on hard", () => {
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.2);
    const stat = simulateOpponentStat(stats, "hard");
    expect(stat).toBe("newaza");
  });

  it("samples easy difficulty across seeds to keep distribution roughly uniform", () => {
    const counts = sampleChoices("easy");
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    for (const key of statKeys) {
      const share = (counts.get(key) ?? 0) / total;
      expect(share).toBeGreaterThanOrEqual(EASY_MIN_SHARE);
      expect(share).toBeLessThanOrEqual(EASY_MAX_SHARE);
    }
  });

  it("samples medium difficulty and requires above-average stats most of the time", () => {
    const counts = sampleChoices("medium");
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const average = Object.values(stats).reduce((sum, value) => sum + value, 0) / statKeys.length;
    const aboveAverageStats = statKeys.filter((key) => Number(stats[key]) >= average);
    const aboveAverageSelections = aboveAverageStats.reduce(
      (sum, key) => sum + (counts.get(key) ?? 0),
      0
    );
    expect(aboveAverageSelections / total).toBeGreaterThanOrEqual(MEDIUM_ABOVE_AVERAGE_THRESHOLD);
  });

  it("always selects the top stat on hard difficulty across deterministic seeds", () => {
    const counts = sampleChoices("hard");
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const bestStat = statKeys.reduce((currentBest, key) => {
      if (currentBest === null) return key;
      return stats[key] > stats[currentBest] ? key : currentBest;
    }, null);
    expect(counts.get(bestStat)).toBe(total);
    for (const key of statKeys) {
      if (key === bestStat) continue;
      expect(counts.get(key) ?? 0).toBe(0);
    }
  });

  it("feeds the chosen stat through handleStatSelection to resolve the round", async () => {
    document.body.innerHTML = `
      <div id="stat-buttons"></div>
      <header>
        <div id="round-message"></div>
        <div id="score-display"></div>
      </header>
    `;

    const store = createBattleStore();
    store.currentPlayerJudoka = {
      stats: { power: 2, speed: 7, technique: 4, kumikata: 6, newaza: 3 }
    };
    store.currentOpponentJudoka = {
      stats: { power: 5, speed: 3, technique: 8, kumikata: 9, newaza: 10 }
    };

    setTestMode({ enabled: true, seed: 11 });
    const chosenStat = simulateOpponentStat(store.currentOpponentJudoka.stats, "medium");
    setTestMode(false);

    const expectedPlayer = Number(store.currentPlayerJudoka.stats[chosenStat]);
    const expectedOpponent = Number(store.currentOpponentJudoka.stats[chosenStat]);

    const result = await handleStatSelection(store, chosenStat, { forceDirectResolution: true });

    expect(roundResolver.resolveRound).toHaveBeenCalledWith(
      store,
      chosenStat,
      expectedPlayer,
      expectedOpponent,
      expect.objectContaining({ delayMs: 0 })
    );
    expect(result.delta).toBe(expectedPlayer - expectedOpponent);
  });
});
