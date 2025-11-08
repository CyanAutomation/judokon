import { beforeEach, describe, expect, it } from "vitest";
import { createBattleStore } from "../../../src/helpers/classicBattle/roundManager.js";
import { __matchDeckTestUtils } from "../../../src/helpers/classicBattle/matchDeckManager.js";

const {
  createMatchDeckFromPool,
  getNextDeckCandidate,
  acceptDeckCandidate,
  rejectDeckCandidate,
  resetMatchDeckState
} = __matchDeckTestUtils;

describe("Classic Battle match deck helpers", () => {
  let store;
  let pool;

  beforeEach(() => {
    store = createBattleStore();
    resetMatchDeckState(store);
    pool = [
      { id: "judoka-1", name: "Judoka 1", isHidden: false },
      { id: "judoka-2", name: "Judoka 2", isHidden: false },
      { id: "judoka-3", name: "Judoka 3", isHidden: false }
    ];
  });

  it("creates a deterministic deck without duplicates", () => {
    const deck = createMatchDeckFromPool(pool, 3);
    expect(deck).toHaveLength(3);
    const ids = deck.map((judoka) => judoka?.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws unique opponents until the deck is exhausted", () => {
    const drawnIds = [];
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = getNextDeckCandidate(store, pool);
      expect(candidate).toBeTruthy();
      if (candidate) {
        expect(drawnIds).not.toContain(candidate.id);
        drawnIds.push(candidate.id);
        acceptDeckCandidate(store, candidate, { isFallback: false });
      }
    }
    expect(new Set(drawnIds)).toHaveLength(pool.length);
  });

  it("re-queues rejected candidates so the next draw advances", () => {
    const first = getNextDeckCandidate(store, pool);
    expect(first).toBeTruthy();
    if (first) {
      rejectDeckCandidate(store, first, { reason: "sameAsPlayer" });
    }
    const second = getNextDeckCandidate(store, pool);
    expect(second).toBeTruthy();
    if (first && second) {
      expect(second.id).not.toBe(first.id);
    }
  });

  it("replenishes the deck after all opponents have been used", () => {
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = getNextDeckCandidate(store, pool);
      expect(candidate).toBeTruthy();
      acceptDeckCandidate(store, candidate, { isFallback: false });
    }

    expect(store.matchDeck).toHaveLength(0);
    const next = getNextDeckCandidate(store, pool);
    expect(next).toBeTruthy();
    acceptDeckCandidate(store, next, { isFallback: false });
    expect(store.usedOpponentIds instanceof Set).toBe(true);
    expect(store.usedOpponentIds.size).toBeGreaterThan(0);
  });
});
