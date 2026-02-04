/**
 * Event data validators for roundUI handlers.
 *
 * Provides type-safe extraction and validation of battle event details
 * to prevent null/undefined errors in event handlers.
 *
 * @module eventValidators
 */

/**
 * Validate and extract roundStarted event details.
 *
 * @pseudocode
 * 1. Check event has detail object.
 * 2. Extract store and roundNumber.
 * 3. Validate roundNumber is a number.
 * 4. Return object or null if invalid.
 *
 * @param {CustomEvent} event - Battle event
 * @returns {{
 *   store: any,
 *   roundNumber: number
 * } | null}
 */
export function validateRoundStartedEvent(event) {
  const { store, roundNumber } = event?.detail || {};
  if (store && typeof roundNumber === "number") {
    return { store, roundNumber };
  }
  return null;
}

/**
 * Validate and extract statSelected event details.
 *
 * @pseudocode
 * 1. Check event has detail object.
 * 2. Extract stat, store, and opts.
 * 3. Ensure stat and store exist.
 * 4. Return object or null if invalid.
 *
 * @param {CustomEvent} event - Battle event
 * @returns {{
 *   stat: string,
 *   store: any,
 *   opts: any
 * } | null}
 */
export function validateStatSelectedEvent(event) {
  const { stat, store, opts } = event?.detail || {};
  if (stat && store) {
    return { stat, store, opts };
  }
  return null;
}

/**
 * Validate and extract round.evaluated event details.
 *
 * @pseudocode
 * 1. Check event has detail object.
 * 2. Extract store and result.
 * 3. Ensure result exists.
 * 4. Return object or null if invalid.
 *
 * @param {CustomEvent} event - Battle event
 * @returns {{
 *   store: any,
 *   result: any
 * } | null}
 */
export function validateRoundEvaluatedEvent(event) {
  const { outcome, scores } = event?.detail || {};
  if (outcome || scores) {
    return { outcome, scores };
  }
  return null;
}
