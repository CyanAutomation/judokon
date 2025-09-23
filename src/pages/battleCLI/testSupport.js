/**
 * Shared helpers for Battle CLI test flows.
 *
 * Provides utilities for normalizing round detail objects and resolving
 * rounds through the classic battle state machine in deterministic tests.
 *
 * @module pages/battleCLI/testSupport
 */

/**
 * Coerce the first numeric-like value in the provided list.
 *
 * @param {...any} values - Values to check for numeric conversion
 * @returns {number} First valid numeric value or 0 as fallback
 * @pseudocode
 * for each value in values:
 *   if value is finite number: return value
 *   if value can be parsed as number: return parsed value
 * return 0 as fallback
 */
function coerceScoreForTest(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (value !== undefined && value !== null) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

/**
 * Normalize event-like input into a round detail object.
 *
 * @param {object} [eventLike]
 * @param {{
 *   getStore?: () => any,
 *   store?: any
 * }} [options]
 * @returns {object}
 * @pseudocode
 * if eventLike has detail → use detail, else clone eventLike
 * ensure result object includes message/playerScore/opponentScore defaults
 * attach provided store fallback when detail lacks store
 * return normalized detail
 */
export function normalizeRoundDetailForTest(eventLike = {}, options = {}) {
  const source =
    eventLike && typeof eventLike === "object" && "detail" in eventLike
      ? eventLike.detail || {}
      : eventLike || {};
  const normalized = { ...source };
  const resultSource = source && typeof source.result === "object" ? { ...source.result } : {};
  const message = resultSource.message ?? source.resultMessage ?? source.message ?? "";
  const playerScore = coerceScoreForTest(
    resultSource.playerScore,
    source.playerScore,
    source.resultPlayerScore
  );
  const opponentScore = coerceScoreForTest(
    resultSource.opponentScore,
    source.opponentScore,
    source.resultOpponentScore
  );

  normalized.result = {
    ...resultSource,
    message,
    playerScore,
    opponentScore
  };

  const { getStore, store } = options || {};
  const fallbackStore =
    store !== undefined ? store : typeof getStore === "function" ? getStore() : undefined;
  if (!normalized.store && fallbackStore) {
    normalized.store = fallbackStore;
  }

  return normalized;
}

/**
 * Resolve the active round through the orchestrator for deterministic tests.
 *
 * @param {object} [eventLike]
 * @param {{
 *   dispatch?: (detail: object) => Promise<unknown> | unknown,
 *   emit?: (detail: object) => void,
 *   getStore?: () => any,
 *   store?: any
 * }} [options]
 * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
 * @pseudocode
 * detail = normalizeRoundDetailForTest(eventLike, options)
 * dispatched = await options.dispatch?.(detail) !== false (swallow errors)
 * emitted = invoke options.emit(detail) when provided (swallow errors)
 * return { detail, dispatched, emitted }
 */
export async function resolveRoundForTest(eventLike = {}, options = {}) {
  const detail = normalizeRoundDetailForTest(eventLike, options);
  let dispatched = false;
  const { dispatch, emit } = options || {};

  if (typeof dispatch === "function") {
    try {
      const result = await dispatch(detail);
      dispatched = result !== false;
    } catch (error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
        console.debug("Test dispatch error (ignored):", error);
      }
    }
  }

  let emitted = false;
  if (typeof emit === "function") {
    try {
      emit(detail);
      emitted = true;
    } catch (error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
        console.debug("Test emit error (ignored):", error);
      }
    }
  }

  return { detail, dispatched, emitted };
}

export default {
  normalizeRoundDetailForTest,
  resolveRoundForTest
};
