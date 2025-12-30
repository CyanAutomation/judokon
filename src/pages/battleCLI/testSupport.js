/**
 * @fileoverview Shared helpers for Battle CLI test flows.
 *
 * **Purpose:**
 * Provides utilities for normalizing round detail objects and resolving
 * rounds through the classic battle state machine in deterministic tests.
 * These helpers bridge the gap between test events and production battle
 * orchestrators to enable predictable round resolution in integration tests.
 *
 * **Location Rationale:**
 * Located in src/pages/battleCLI/ rather than tests/ because these utilities
 * are imported and used by production code (testApi.js, init.js) to support
 * test mode functionality in the Battle CLI interface. This placement allows:
 * - Direct imports from production battle orchestrators
 * - Consistent path resolution across test and production contexts
 * - Feature flag-gated test mode support without circular dependencies
 *
 * **Key Functions:**
 * - normalizeRoundDetailForTest: Normalize event-like inputs into round details
 * - resolveRoundForTest: Execute round resolution with error-safe dispatch/emit
 *
 * **Usage Pattern:**
 * These utilities are typically invoked with orchestrator methods:
 * ```js
 * await resolveRoundForTest(event, {
 *   dispatch: orchestrator.dispatch.bind(orchestrator),
 *   emit: orchestrator.emit.bind(orchestrator),
 *   getStore: () => globalStore
 * });
 * ```
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
 * Await the next animation frame when available, falling back to a microtask.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * if requestAnimationFrame exists → wait for a frame
 * else resolve on the next microtask tick
 */
async function waitForNextFrameForTest() {
  try {
    if (typeof requestAnimationFrame === "function") {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      return;
    }
  } catch {}

  await Promise.resolve();
}

// Allow ~12 frames at 60fps to cover DOM updates triggered by opponent reveal flows
// without introducing long delays that would slow down the CLI test suite.
const OPPONENT_CARD_VISIBILITY_POLL_TIMEOUT_MS = 200;

/**
 * Poll for the opponent card to lose its hidden class after a reveal event.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * skip when document unavailable
 * until deadline reached →
 *   if #opponent-card exists without opponent-hidden → stop
 *   otherwise wait for next frame and retry
 */
async function ensureOpponentCardVisibleForTest() {
  if (typeof document === "undefined") return;

  const deadline = Date.now() + OPPONENT_CARD_VISIBILITY_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const card = document.getElementById("opponent-card");
      if (card && !card.classList.contains("opponent-hidden")) {
        return;
      }
    } catch {}
    await waitForNextFrameForTest();
  }
}

/**
 * Manually remove the opponent-hidden class from the opponent card.
 *
 * @returns {void}
 * @pseudocode
 * when document exists → find #opponent-card and remove opponent-hidden class (ignore errors)
 */
function removeOpponentHiddenClass() {
  try {
    const card = typeof document !== "undefined" ? document.getElementById("opponent-card") : null;
    if (card) card.classList.remove("opponent-hidden");
  } catch {}
}

/**
 * Handle opponent reveal logic for test resolution.
 *
 * @param {object} detail - Normalized round detail
 * @param {Function} [emitOpponentReveal] - Optional reveal emitter
 * @param {Function} logDebug - Debug logger function
 * @returns {Promise<void>}
 * @pseudocode
 * if emitOpponentReveal provided:
 *   emit reveal with detail
 *   wait for next animation frame
 *   manually remove opponent-hidden class
 *   poll until card visible (with timeout)
 *   log any errors in development mode
 */
async function handleOpponentRevealForTest(detail, emitOpponentReveal, logDebug) {
  if (typeof emitOpponentReveal !== "function") return;

  try {
    await emitOpponentReveal(detail);
    await waitForNextFrameForTest();
    removeOpponentHiddenClass();
    await ensureOpponentCardVisibleForTest();
  } catch (error) {
    logDebug("Test opponent reveal emit error (ignored):", error);
  }
}

/**
 * Handle dispatch logic for test resolution.
 *
 * @param {object} detail - Normalized round detail
 * @param {Function} [dispatch] - Optional dispatch function
 * @param {Function} logDebug - Debug logger function
 * @returns {Promise<boolean>} True if dispatched successfully
 * @pseudocode
 * if dispatch provided:
 *   await dispatch(detail)
 *   return true if result !== false
 *   log any errors in development mode
 * return false
 */
async function handleDispatchForTest(detail, dispatch, logDebug) {
  if (typeof dispatch !== "function") return false;

  try {
    const result = await dispatch(detail);
    return result !== false;
  } catch (error) {
    logDebug("Test dispatch error (ignored):", error);
    return false;
  }
}

/**
 * Handle emit logic for test resolution.
 *
 * @param {object} detail - Normalized round detail
 * @param {Function} [emit] - Optional emit function
 * @param {Function} logDebug - Debug logger function
 * @returns {boolean} True if emitted successfully
 * @pseudocode
 * if emit provided:
 *   emit(detail)
 *   return true
 *   log any errors in development mode
 * return false
 */
function handleEmitForTest(detail, emit, logDebug) {
  if (typeof emit !== "function") return false;

  try {
    emit(detail);
    return true;
  } catch (error) {
    logDebug("Test emit error (ignored):", error);
    return false;
  }
}

/**
 * Resolve the active round through the orchestrator for deterministic tests.
 *
 * @param {object} [eventLike]
 * @param {{
 *   dispatch?: (detail: object) => Promise<unknown> | unknown,
 *   emit?: (detail: object) => void,
 *   emitOpponentReveal?: (detail: object) => Promise<unknown> | unknown,
 *   getStore?: () => any,
 *   store?: any
 * }} [options]
 * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
 * @pseudocode
 * detail = normalizeRoundDetailForTest(eventLike, options)
 * create debug logger (development mode only)
 * await handleOpponentRevealForTest(detail, emitOpponentReveal, logDebug)
 * dispatched = await handleDispatchForTest(detail, dispatch, logDebug)
 * emitted = handleEmitForTest(detail, emit, logDebug)
 * return { detail, dispatched, emitted }
 */
export async function resolveRoundForTest(eventLike = {}, options = {}) {
  const detail = normalizeRoundDetailForTest(eventLike, options);
  const { dispatch, emit, emitOpponentReveal } = options || {};
  const isDevelopmentEnv =
    typeof process !== "undefined" && process?.env?.NODE_ENV === "development";

  const logDebug = (message, error) => {
    if (!isDevelopmentEnv) return;
    try {
      console.debug(message, error);
    } catch {}
  };

  await handleOpponentRevealForTest(detail, emitOpponentReveal, logDebug);
  const dispatched = await handleDispatchForTest(detail, dispatch, logDebug);
  const emitted = handleEmitForTest(detail, emit, logDebug);

  return { detail, dispatched, emitted };
}

export default {
  normalizeRoundDetailForTest,
  resolveRoundForTest
};
