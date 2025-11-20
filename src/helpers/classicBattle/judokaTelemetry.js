/**
 * @summary Consolidated telemetry tracking for judoka load failures.
 * @description Manages failure count, sampling, and emission to Sentry for recurring issues.
 */

const JUDOKA_FAILURE_TELEMETRY_THRESHOLD = 3;
const JUDOKA_FAILURE_TELEMETRY_WINDOW_MS = 120000;
const JUDOKA_FAILURE_TELEMETRY_SAMPLE_RATE = 0.25;

/**
 * Initialize failure telemetry state.
 *
 * @returns {Object} Telemetry state object with count, timestamps, reported flag, and sampled flag.
 */
function createTelemetryState() {
  return {
    count: 0,
    firstTimestamp: 0,
    lastTimestamp: 0,
    reported: false,
    sampled: null
  };
}

let telemetryState = createTelemetryState();

/**
 * Determine whether this failure instance should be sampled for reporting.
 *
 * @returns {boolean} True if this event should be reported.
 *
 * @pseudocode
 * 1. Check for forced override via window.__CLASSIC_BATTLE_FORCE_JUDOKA_TELEMETRY.
 * 2. Generate random sample based on configured rate.
 */
function shouldSampleJudokaFailureTelemetry() {
  if (typeof window !== "undefined") {
    try {
      const forced = window.__CLASSIC_BATTLE_FORCE_JUDOKA_TELEMETRY;
      if (typeof forced === "boolean") {
        return forced;
      }
    } catch {}
  }
  return Math.random() < JUDOKA_FAILURE_TELEMETRY_SAMPLE_RATE;
}

/**
 * Emit telemetry data to Sentry when thresholds are met.
 *
 * @private
 */
function emitJudokaLoadFailureTelemetry(state, safeContext, timestamp) {
  try {
    if (typeof window !== "undefined") {
      try {
        window.__classicBattleJudokaFailureTelemetry = {
          count: state.count,
          context: safeContext,
          firstTimestamp: state.firstTimestamp,
          reportedAt: timestamp
        };
      } catch {}
    }

    if (typeof Sentry !== "undefined") {
      if (typeof Sentry.startSpan === "function") {
        Sentry.startSpan(
          {
            op: "ui.retry",
            name: "classicBattle.judokaLoad.retryLoop"
          },
          (span) => {
            try {
              if (span && typeof span.setAttribute === "function") {
                span.setAttribute("failureCount", state.count);
                span.setAttribute("elapsedMs", timestamp - state.firstTimestamp);
                span.setAttribute("context", safeContext);
                span.setAttribute("sampleRate", JUDOKA_FAILURE_TELEMETRY_SAMPLE_RATE);
                span.setAttribute("threshold", JUDOKA_FAILURE_TELEMETRY_THRESHOLD);
              }
            } catch {}
          }
        );
      }

      if (Sentry?.logger?.warn) {
        try {
          Sentry.logger.warn(Sentry.logger.fmt`classicBattle:judokaLoadFailure:${safeContext}`, {
            count: state.count,
            elapsedMs: timestamp - state.firstTimestamp,
            threshold: JUDOKA_FAILURE_TELEMETRY_THRESHOLD
          });
        } catch {}
      }
    }
  } catch {}
}

/**
 * Record a judoka load failure and emit telemetry when thresholds are met.
 *
 * @param {string} [context="unspecified"] - Context or location where the failure occurred.
 * @returns {void}
 *
 * @pseudocode
 * 1. Track failure count and timestamps.
 * 2. Reset tracking if telemetry window has elapsed.
 * 3. Check if failure count exceeds threshold and telemetry window is still open.
 * 4. Sample the failure based on configured rate.
 * 5. Emit telemetry data to Sentry if sampled.
 * 6. Mark as reported to prevent duplicate emissions.
 */
export function recordJudokaLoadFailureTelemetry(context) {
  const now = Date.now();
  const windowExceeded =
    telemetryState.firstTimestamp &&
    now - telemetryState.firstTimestamp > JUDOKA_FAILURE_TELEMETRY_WINDOW_MS;

  if (!telemetryState.firstTimestamp || windowExceeded) {
    telemetryState = createTelemetryState();
    if (windowExceeded) {
      telemetryState.reported = false;
    }
  }

  telemetryState.count += 1;
  telemetryState.lastTimestamp = now;

  const safeContext = typeof context === "string" && context ? context : "unspecified";

  if (telemetryState.reported) {
    return;
  }

  if (telemetryState.count < JUDOKA_FAILURE_TELEMETRY_THRESHOLD) {
    return;
  }

  if (now - telemetryState.firstTimestamp > JUDOKA_FAILURE_TELEMETRY_WINDOW_MS) {
    return;
  }

  if (telemetryState.sampled === null) {
    telemetryState.sampled = shouldSampleJudokaFailureTelemetry();
  }

  if (!telemetryState.sampled) {
    telemetryState.reported = true;
    return;
  }

  emitJudokaLoadFailureTelemetry(telemetryState, safeContext, now);
  telemetryState.reported = true;
}

/**
 * Get the current telemetry state (mainly for testing).
 *
 * @returns {Object} Current telemetry state.
 *
 * @pseudocode
 * 1. Return the in-memory telemetryState object.
 */
export function getTelemetryState() {
  return telemetryState;
}

/**
 * Reset telemetry state (mainly for testing).
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. Recreate the telemetry state object with default values.
 * 2. Replace the module-level telemetryState reference.
 */
export function resetTelemetryState() {
  telemetryState = createTelemetryState();
}
