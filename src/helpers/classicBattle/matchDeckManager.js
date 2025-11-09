import { seededRandom } from "../testModeUtils.js";

/**
 * Default number of opponents that should be present in a generated match deck.
 * @type {number}
 * @pseudocode defaultMatchDeckSize = 25
 */
export const DEFAULT_MATCH_DECK_SIZE = 25;

function normalizeDeckPool(pool) {
  if (!Array.isArray(pool)) return [];
  const unique = [];
  const seen = new Set();
  for (const judoka of pool) {
    if (!judoka || typeof judoka !== "object") continue;
    if (judoka.isHidden) continue;
    const id = judoka.id;
    if (id && seen.has(id)) continue;
    if (id) {
      seen.add(id);
    }
    unique.push(judoka);
  }
  return unique;
}

function shuffleJudokaWithSeed(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const rand = Math.floor(seededRandom() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[rand];
    arr[rand] = tmp;
  }
  return arr;
}

function createMatchDeckFromPool(pool, deckSize = DEFAULT_MATCH_DECK_SIZE) {
  const normalized = normalizeDeckPool(pool);
  if (normalized.length === 0) return [];
  const shuffled = shuffleJudokaWithSeed(normalized);
  if (!Number.isFinite(deckSize) || deckSize <= 0 || deckSize >= shuffled.length) {
    return shuffled;
  }
  return shuffled.slice(0, deckSize);
}

function ensureMatchDeckInitialized(store, pool) {
  if (!store || typeof store !== "object") return [];
  if (!(store.usedOpponentIds instanceof Set)) {
    store.usedOpponentIds = new Set();
  }
  const deckSize =
    Number.isFinite(store.matchDeckSize) && store.matchDeckSize > 0
      ? Math.floor(store.matchDeckSize)
      : DEFAULT_MATCH_DECK_SIZE;

  if (!Array.isArray(store.matchDeck) || store.matchDeck.length === 0) {
    const availablePool = normalizeDeckPool(pool);
    const unused = availablePool.filter((judoka) => {
      const id = judoka?.id;
      return !id || !store.usedOpponentIds.has(id);
    });

    let candidatePool = unused;
    if (candidatePool.length === 0) {
      if (store.usedOpponentIds.size > 0) {
        store.usedOpponentIds.clear();
      }
      candidatePool = availablePool;
    }

    store.matchDeck = createMatchDeckFromPool(candidatePool, deckSize);
  }

  return Array.isArray(store.matchDeck) ? store.matchDeck : [];
}

function getNextDeckCandidate(store, pool) {
  const deck = ensureMatchDeckInitialized(store, pool);
  if (!deck.length) {
    store.pendingOpponentFromDeck = null;
    return null;
  }
  if (store.pendingOpponentFromDeck) {
    return store.pendingOpponentFromDeck;
  }
  const candidate = deck.shift() ?? null;
  store.pendingOpponentFromDeck = candidate ?? null;
  return candidate;
}

function acceptDeckCandidate(store, candidate, { isFallback } = {}) {
  if (!store || typeof store !== "object") return;
  const pending = store.pendingOpponentFromDeck;
  if (!pending) {
    store.pendingOpponentFromDeck = null;
    return;
  }

  const pendingId = pending?.id ?? null;
  const candidateId = candidate?.id ?? null;

  if (pendingId && candidateId && pendingId === candidateId && !isFallback) {
    if (!(store.usedOpponentIds instanceof Set)) {
      store.usedOpponentIds = new Set();
    }
    store.usedOpponentIds.add(candidateId);
  }

  store.pendingOpponentFromDeck = null;
}

function rejectDeckCandidate(store, candidate, { reason } = {}) {
  if (!store || typeof store !== "object") return;
  const pending = store.pendingOpponentFromDeck;
  if (!pending) return;

  const pendingId = pending?.id ?? null;
  const candidateId = candidate?.id ?? null;
  const shouldRequeue =
    reason !== "fallback" &&
    (!pendingId ||
      (candidateId && candidateId === pendingId) ||
      candidate === undefined ||
      candidate === null);

  if (shouldRequeue) {
    if (!Array.isArray(store.matchDeck)) {
      store.matchDeck = [];
    }
    store.matchDeck.push(pending);
  }

  store.pendingOpponentFromDeck = null;
}

/**
 * Reset all persisted state related to the match deck for the provided store.
 *
 * @param {{ [key: string]: any }} store - Mutable store object that tracks deck state.
 * @returns {void}
 * @pseudocode
 * if store is not an object: return
 * store.matchDeck = []
 * store.pendingOpponentFromDeck = null
 * ensure store.usedOpponentIds is an empty Set
 */
export function resetMatchDeckState(store) {
  if (!store || typeof store !== "object") return;
  store.matchDeck = [];
  store.pendingOpponentFromDeck = null;
  if (store.usedOpponentIds instanceof Set) {
    store.usedOpponentIds.clear();
  } else {
    store.usedOpponentIds = new Set();
  }
}

/**
 * Create helper callbacks that manage the lifecycle of match deck selections.
 *
 * @param {{ [key: string]: any }} store - Mutable store object that tracks deck state.
 * @returns {{
 *   randomJudoka(pool: any[]): any,
 *   onCandidateAccepted(candidate: any, meta?: { isFallback?: boolean }): void,
 *   onCandidateRejected(candidate: any, meta?: { reason?: string }): void
 * }} Interface for performing deck interactions.
 * @pseudocode
 * return {
 *   randomJudoka: delegate to getNextDeckCandidate with store
 *   onCandidateAccepted: delegate to acceptDeckCandidate with store
 *   onCandidateRejected: delegate to rejectDeckCandidate with store
 * }
 */
export function createMatchDeckHooks(store) {
  return {
    randomJudoka(pool) {
      return getNextDeckCandidate(store, pool);
    },
    onCandidateAccepted(candidate, meta) {
      acceptDeckCandidate(store, candidate, meta);
    },
    onCandidateRejected(candidate, meta) {
      rejectDeckCandidate(store, candidate, meta);
    }
  };
}

export const __matchDeckTestUtils = {
  DEFAULT_MATCH_DECK_SIZE,
  createMatchDeckFromPool,
  ensureMatchDeckInitialized,
  getNextDeckCandidate,
  acceptDeckCandidate,
  rejectDeckCandidate,
  resetMatchDeckState
};
