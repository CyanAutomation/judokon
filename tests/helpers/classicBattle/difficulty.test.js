import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";
import { roundResolverMock } from "./mocks/simulateOpponentStat.js";
import { createStatButtonsHarness } from "../../utils/componentTestUtils.js";

describe("simulateOpponentStat difficulty", () => {
  /**
   * Probability expectations derived from 200 deterministic seeds using the
   * current sin-based RNG in `seededRandom`. Update these thresholds alongside
   * the distribution tests whenever the weighting algorithm changes so tuning
   * remains fast and intentional.
   */
  const DISTRIBUTION_SAMPLE_SIZE = Number.parseInt(process.env.TEST_SAMPLE_SIZE ?? "", 10) || 200;
  const DISTRIBUTION_SAMPLE_SEEDS = Array.from(
    { length: DISTRIBUTION_SAMPLE_SIZE },
    (_, index) => index + 1
  );
  const EASY_MIN_SHARE = 0.15;
  const EASY_MAX_SHARE = 0.3;
  const MEDIUM_ABOVE_AVERAGE_THRESHOLD = 0.7;

  let simulateOpponentStat;
  let handleStatSelection;
  let createBattleStore;
  let stats;
  let statKeys;
  let setTestMode;
  let randomSpy;

  beforeEach(async () => {
    stats = { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 };
    ({ simulateOpponentStat, handleStatSelection } = await import(
      "../../../src/helpers/classicBattle/selectionHandler.js"
    ));
    ({ createBattleStore } = await import("../../../src/helpers/classicBattle/roundManager.js"));
    ({ STATS: statKeys } = await import("../../../src/helpers/battleEngineFacade.js"));
    ({ setTestMode } = await import("../../../src/helpers/testModeUtils.js"));
    setTestMode(false);
    roundResolverMock.resolveRound.mockClear();
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
    vi.restoreAllMocks();
  });

  /**
   * Samples stat choices across deterministic seeds for distribution analysis.
   * @param {"easy"|"medium"|"hard"} difficulty - Difficulty level to test.
   * @param {Record<string, number>} [sourceStats=stats] - Stat map to draw from.
   * @returns {Map<string, number>} Count of selections by stat key.
   */
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

  function validateDistribution(counts, expectedShares) {
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    for (const [key, { min, max }] of Object.entries(expectedShares)) {
      const share = (counts.get(key) ?? 0) / total;
      expect(share).toBeGreaterThanOrEqual(min);
      expect(share).toBeLessThanOrEqual(max);
    }
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
    const expectedShares = Object.fromEntries(
      statKeys.map((key) => [key, { min: EASY_MIN_SHARE, max: EASY_MAX_SHARE }])
    );
    validateDistribution(counts, expectedShares);
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
    const harness = await createStatButtonsHarness();
    const store = createBattleStore();
    store.currentPlayerJudoka = {
      stats: { power: 2, speed: 7, technique: 4, kumikata: 6, newaza: 3 }
    };
    store.currentOpponentJudoka = {
      stats: { power: 5, speed: 3, technique: 8, kumikata: 9, newaza: 10 }
    };

    try {
      setTestMode({ enabled: true, seed: 11 });
      const chosenStat = simulateOpponentStat(store.currentOpponentJudoka.stats, "medium");
      setTestMode(false);

      const expectedPlayer = Number(store.currentPlayerJudoka.stats[chosenStat]);
      const expectedOpponent = Number(store.currentOpponentJudoka.stats[chosenStat]);

      const result = await handleStatSelection(store, chosenStat, { forceDirectResolution: true });

      expect(roundResolverMock.resolveRound).toHaveBeenCalledWith(
        store,
        chosenStat,
        expectedPlayer,
        expectedOpponent,
        expect.objectContaining({ delayMs: 0 })
      );
      expect(result.delta).toBe(expectedPlayer - expectedOpponent);
    } finally {
      harness.cleanup();
    }
  });
});
