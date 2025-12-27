/**
 * Timer control helpers for the BattleEngine.
 *
 * @note Callbacks are optional and guarded to prevent execution after match end.
 * @note Event emissions include Sentry telemetry for production monitoring.
 */

// Telemetry configuration for drift event tracking
const TIMER_DRIFT_TELEMETRY_THRESHOLD = 2;
const TIMER_DRIFT_TELEMETRY_WINDOW_MS = 30000;

let timerDriftState = {
  count: 0,
  firstTimestamp: 0,
  reported: false
};

/**
 * Emit timer lifecycle event with optional Sentry telemetry.
 *
 * @pseudocode
 * 1. Emit the event on engine
 * 2. If Sentry is available, wrap with startSpan for performance tracking
 * 3. Add contextual attributes for debugging
 *
 * @private
 */
function emitTimerEvent(engine, eventName, payload = {}) {
  engine.emit(eventName, payload);

  // Add Sentry tracing for key events
  if (typeof Sentry !== "undefined" && typeof Sentry.startSpan === "function") {
    try {
      Sentry.startSpan(
        {
          op: "timer.state",
          name: `timer.${eventName}`
        },
        (span) => {
          if (span && typeof span.setAttribute === "function") {
            span.setAttribute("eventName", eventName);
            Object.entries(payload).forEach(([key, value]) => {
              if (typeof value === "number" || typeof value === "string") {
                span.setAttribute(key, value);
              }
            });
          }
        }
      );
    } catch {}
  }
}

/**
 * Record timer drift event and emit telemetry when threshold is met.
 *
 * @pseudocode
 * 1. Increment drift event counter
 * 2. Reset counter if telemetry window has elapsed
 * 3. When threshold is met, emit to Sentry with drift metrics
 * 4. Log warning for production monitoring
 *
 * @private
 */
function recordTimerDriftTelemetry(driftAmount) {
  const now = Date.now();
  const windowExceeded =
    timerDriftState.firstTimestamp &&
    now - timerDriftState.firstTimestamp > TIMER_DRIFT_TELEMETRY_WINDOW_MS;

  if (!timerDriftState.firstTimestamp || windowExceeded) {
    timerDriftState = {
      count: 0,
      firstTimestamp: now,
      reported: false
    };
  }

  timerDriftState.count += 1;

  // Emit telemetry when threshold is reached
  if (timerDriftState.count >= TIMER_DRIFT_TELEMETRY_THRESHOLD && !timerDriftState.reported) {
    try {
      if (typeof Sentry !== "undefined") {
        if (typeof Sentry.startSpan === "function") {
          Sentry.startSpan(
            {
              op: "timer.drift",
              name: "timer.drift.threshold_exceeded"
            },
            (span) => {
              if (span && typeof span.setAttribute === "function") {
                span.setAttribute("driftCount", timerDriftState.count);
                span.setAttribute("windowMs", TIMER_DRIFT_TELEMETRY_WINDOW_MS);
                span.setAttribute("threshold", TIMER_DRIFT_TELEMETRY_THRESHOLD);
              }
            }
          );
        }

        if (Sentry?.logger?.warn) {
          Sentry.logger.warn("timer:driftThresholdExceeded", {
            count: timerDriftState.count,
            threshold: TIMER_DRIFT_TELEMETRY_THRESHOLD,
            lastDriftAmount: driftAmount
          });
        }
      }
    } catch {}

    timerDriftState.reported = true;
  }
}

/**
 * Helper to create a guarded expiration callback that checks match state.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. If engine.matchEnded is true, skip execution.
 * 3. If callback exists and is a function, await it.
 *
 * @param {object} engine - Battle engine instance.
 * @param {function(): (void|Promise<void>)} [onExpired] - Optional expiration callback.
 * @returns {function(): Promise<void>} Guarded async callback.
 * @private
 */
function createGuardedExpiredCallback(engine, onExpired) {
  if (!engine) {
    throw new Error("engineTimer: engine parameter is required");
  }
  return async () => {
    if (!engine.matchEnded && typeof onExpired === "function") {
      await onExpired();
    }
  };
}

/**
 * Helper to create a tick callback wrapper that emits engine events.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. Emit timerTick event with remaining time and phase.
 * 3. If callback exists and is a function, call it with remaining time.
 *
 * @param {object} engine - Battle engine instance.
 * @param {string} phase - Timer phase ("round" or "cooldown").
 * @param {function(number): void} [onTick] - Optional tick callback.
 * @returns {function(number): void} Wrapped tick callback.
 * @private
 */
function createTickCallback(engine, phase, onTick) {
  if (!engine) {
    throw new Error("engineTimer: engine parameter is required");
  }
  return (remaining) => {
    engine.emit("timerTick", { remaining, phase });
    if (typeof onTick === "function") onTick(remaining);
  };
}

/**
 * Start the round/stat selection timer.
 *
 * @pseudocode
 * 1. Validate engine parameter exists.
 * 2. Emit `roundStarted` with incremented round number.
 * 3. Create wrapped callbacks: tick emits phase="round", expired guards against post-match.
 * 4. Delegate to `TimerController.startRound`.
 * 5. If onDrift is provided, wrap it to emit timerDriftDetected event.
 *
 * @param {object} engine - Battle engine instance (required).
 * @param {function(number): void} [onTick] - Optional tick callback called each second.
 * @param {function(): (void|Promise<void>)} [onExpired] - Optional expiration callback.
 * @param {number} [duration] - Timer duration in seconds.
 * @param {function(number): void} [onDrift] - Optional drift handler, invoked with remaining time.
 * @returns {Promise<void>} Resolves when timer starts successfully.
 * @throws {Error} If engine parameter is missing.
 */
export function startRoundTimer(engine, onTick, onExpired, duration, onDrift) {
  if (!engine) {
    throw new Error("engineTimer: startRoundTimer requires engine parameter");
  }

  const round = engine.roundsPlayed + 1;
  emitTimerEvent(engine, "roundStarted", { round });

  const tickCallback = createTickCallback(engine, "round", onTick);
  const expiredCallback = createGuardedExpiredCallback(engine, onExpired);

  // Wrap drift handler to emit event if provided
  const wrappedDrift = onDrift
    ? (driftAmount) => {
        emitTimerEvent(engine, "timerDriftDetected", {
          phase: "round",
          remaining: driftAmount
        });
        onDrift(driftAmount);
      }
    : undefined;

  return engine.timer.startRound(tickCallback, expiredCallback, duration, wrappedDrift);
}

/**
 * Start the cooldown timer between rounds.
 *
 * @pseudocode
 * 1. Validate engine parameter exists.
 * 2. Create wrapped callbacks: tick emits phase="cooldown", expired guards against post-match.
 * 3. Delegate to `TimerController.startCoolDown`.
 * 4. If onDrift is provided, wrap it to emit timerDriftDetected event.
 *
 * @param {object} engine - Battle engine instance (required).
 * @param {function(number): void} [onTick] - Optional tick callback called each second.
 * @param {function(): (void|Promise<void>)} [onExpired] - Optional expiration callback.
 * @param {number} [duration] - Cooldown duration in seconds.
 * @param {function(number): void} [onDrift] - Optional drift handler, invoked with remaining time.
 * @returns {Promise<void>} Resolves when timer starts successfully.
 * @throws {Error} If engine parameter is missing.
 */
export function startCoolDownTimer(engine, onTick, onExpired, duration, onDrift) {
  if (!engine) {
    throw new Error("engineTimer: startCoolDownTimer requires engine parameter");
  }

  const tickCallback = createTickCallback(engine, "cooldown", onTick);
  const expiredCallback = createGuardedExpiredCallback(engine, onExpired);

  // Wrap drift handler to emit event if provided
  const wrappedDrift = onDrift
    ? (driftAmount) => {
        emitTimerEvent(engine, "timerDriftDetected", {
          phase: "cooldown",
          remaining: driftAmount
        });
        onDrift(driftAmount);
      }
    : undefined;

  return engine.timer.startCoolDown(tickCallback, expiredCallback, duration, wrappedDrift);
}

/**
 * Pause the active timer.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. Emit `timerPaused` event with telemetry.
 * 3. Invoke `pause()` on the underlying timer.
 *
 * @param {object} engine - Battle engine instance (required).
 * @returns {void}
 * @throws {Error} If engine parameter is missing.
 */
export function pauseTimer(engine) {
  if (!engine) {
    throw new Error("engineTimer: pauseTimer requires engine parameter");
  }
  emitTimerEvent(engine, "timerPaused", {});
  engine.timer.pause();
}

/**
 * Resume the active timer.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. Emit `timerResumed` event with telemetry.
 * 3. Invoke `resume()` on the underlying timer.
 *
 * @param {object} engine - Battle engine instance (required).
 * @returns {void}
 * @throws {Error} If engine parameter is missing.
 */
export function resumeTimer(engine) {
  if (!engine) {
    throw new Error("engineTimer: resumeTimer requires engine parameter");
  }
  emitTimerEvent(engine, "timerResumed", {});
  engine.timer.resume();
}

/**
 * Stop the active timer.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. Emit `timerStopped` event with telemetry.
 * 3. Invoke `stop()` on the underlying timer.
 *
 * @param {object} engine - Battle engine instance (required).
 * @returns {void}
 * @throws {Error} If engine parameter is missing.
 */
export function stopTimer(engine) {
  if (!engine) {
    throw new Error("engineTimer: stopTimer requires engine parameter");
  }
  emitTimerEvent(engine, "timerStopped", {});
  engine.timer.stop();
}

/**
 * Mark the tab inactive and pause the timer.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. Emit `tabInactive` event for observability with telemetry.
 * 3. Pause the timer.
 * 4. Set `tabInactive` flag.
 *
 * @param {object} engine - Battle engine instance (required).
 * @returns {void}
 * @throws {Error} If engine parameter is missing.
 */
export function handleTabInactive(engine) {
  if (!engine) {
    throw new Error("engineTimer: handleTabInactive requires engine parameter");
  }
  emitTimerEvent(engine, "tabInactive", {});
  pauseTimer(engine);
  engine.tabInactive = true;
}

/**
 * Resume the timer if the tab becomes active.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. If previously inactive, emit `tabActive` event with telemetry, resume timer, and clear flag.
 *
 * @param {object} engine - Battle engine instance (required).
 * @returns {void}
 * @throws {Error} If engine parameter is missing.
 */
export function handleTabActive(engine) {
  if (!engine) {
    throw new Error("engineTimer: handleTabActive requires engine parameter");
  }
  if (engine.tabInactive) {
    emitTimerEvent(engine, "tabActive", {});
    resumeTimer(engine);
    engine.tabInactive = false;
  }
}

/**
 * Handle timer drift by stopping the timer and recording the amount.
 *
 * @pseudocode
 * 1. Validate engine exists.
 * 2. Validate driftAmount is a number >= 0.
 * 3. Emit `timerDriftRecorded` event with telemetry.
 * 4. Record drift for threshold-based telemetry emission.
 * 5. Stop the timer.
 * 6. Record the drift amount on the engine.
 *
 * @param {object} engine - Battle engine instance (required).
 * @param {number} driftAmount - Amount of drift detected (must be >= 0).
 * @returns {void}
 * @throws {Error} If engine parameter is missing or driftAmount is invalid.
 */
export function handleTimerDrift(engine, driftAmount) {
  if (!engine) {
    throw new Error("engineTimer: handleTimerDrift requires engine parameter");
  }
  if (typeof driftAmount !== "number" || driftAmount < 0) {
    const msg = `engineTimer: restartTimerAfterDrift requires driftAmount >= 0, got ${driftAmount}`;
    throw new Error(msg);
  }
  emitTimerEvent(engine, "timerDriftRecorded", { driftAmount });
  recordTimerDriftTelemetry(driftAmount);
  stopTimer(engine);
  engine.lastTimerDrift = driftAmount;
}
