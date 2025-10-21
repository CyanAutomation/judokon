import { emitBattleEvent } from "./battleEvents.js";

/**
 * @summary Default minimum display duration for the opponent prompt message in milliseconds.
 * @returns {number} The DEFAULT_MIN_PROMPT_DURATION_MS constant.
 * @pseudocode
 * 1. Provide the shared constant used to gate opponent prompt visibility.
 */
export const DEFAULT_MIN_PROMPT_DURATION_MS = 600;

let lastPromptTimestamp = 0;

const clampToPositiveTimestamp = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return Number.EPSILON;
  }
  return numeric;
};

function now() {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      const timestamp = performance.now();
      if (Number.isFinite(timestamp)) {
        return clampToPositiveTimestamp(timestamp);
      }
    }
  } catch {}
  try {
    const timestamp = Date.now();
    if (Number.isFinite(timestamp)) {
      return clampToPositiveTimestamp(timestamp);
    }
  } catch {}
  return Number.EPSILON;
}

/**
 * @summary Records the timestamp when the opponent prompt was shown.
 * @param {number} [timestamp=now()] - The timestamp to record. Defaults to the current time.
 * @param {{ notify?: boolean }} [options] - Control whether the ready event is emitted.
 * @returns {number | null} The recorded timestamp when valid.
 * @pseudocode
 * 1. Get the current timestamp if not provided.
 * 2. Validate that the timestamp is a finite, non-negative number.
 * 3. If valid, update the module-scoped `lastPromptTimestamp`.
 * 4. Emit the `opponentPromptReady` battle event unless `options.notify === false`.
 * 5. Return the recorded timestamp for downstream consumers.
 */
export function recordOpponentPromptTimestamp(timestamp = now(), options = {}) {
  const value = Number(timestamp);
  if (Number.isFinite(value) && value >= 0) {
    const normalizedValue = clampToPositiveTimestamp(value);
    lastPromptTimestamp = normalizedValue;
    if (options.notify !== false) {
      notifyPromptReady(normalizedValue);
    }
    return normalizedValue;
  }
  return null;
}

function notifyPromptReady(timestamp) {
  try {
    if (typeof emitBattleEvent === "function") {
      emitBattleEvent("opponentPromptReady", { timestamp });
    }
  } catch (error) {
    const isProduction =
      typeof process !== "undefined" && typeof process.env !== "undefined"
        ? process.env.NODE_ENV === "production"
        : false;
    if (!isProduction && typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("Failed to emit opponentPromptReady event:", error);
    }
  }
}

/**
 * @summary Retrieves the last recorded opponent prompt timestamp.
 * @returns {number} The last recorded timestamp, or 0 if none is set.
 * @pseudocode
 * 1. Return the value of the module-scoped `lastPromptTimestamp`.
 */
export function getOpponentPromptTimestamp() {
  return lastPromptTimestamp;
}

/**
 * @summary Resets the opponent prompt timestamp to 0.
 * @returns {void}
 * @pseudocode
 * 1. Set the module-scoped `lastPromptTimestamp` to 0.
 */
export function resetOpponentPromptTimestamp() {
  lastPromptTimestamp = 0;
}

/**
 * @summary A convenience helper to record the current time as the opponent prompt timestamp.
 * @param {{ notify?: boolean }} [options] - Pass-through options for notification behavior.
 * @returns {number | null} The recorded timestamp when valid.
 * @pseudocode
 * 1. Get the current time using the internal `now()` helper.
 * 2. Call `recordOpponentPromptTimestamp` with the current time and options.
 * 3. Return the recorded timestamp for callers that need to reuse the value.
 */
export function markOpponentPromptNow(options = {}) {
  return recordOpponentPromptTimestamp(now(), options);
}

function readMinOverride() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.__MIN_OPPONENT_MESSAGE_DURATION_MS;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

/**
 * @summary Gets the minimum duration for the opponent prompt message.
 * @description Checks for a window override (`__MIN_OPPONENT_MESSAGE_DURATION_MS`) and falls back to the default constant.
 * @returns {number} The minimum duration in milliseconds.
 * @pseudocode
 * 1. Read the override value from `window.__MIN_OPPONENT_MESSAGE_DURATION_MS`.
 * 2. If the override is a valid non-negative number, return it.
 * 3. Otherwise, return the `DEFAULT_MIN_PROMPT_DURATION_MS`.
 */
export function getOpponentPromptMinDuration() {
  const override = readMinOverride();
  return Number.isFinite(override) && override >= 0
    ? Number(override)
    : DEFAULT_MIN_PROMPT_DURATION_MS;
}
