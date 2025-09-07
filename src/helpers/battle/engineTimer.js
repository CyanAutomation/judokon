/**
 * Timer control helpers for the BattleEngine.
 */

/**
 * Start the round/stat selection timer.
 *
 * @pseudocode
 * 1. Emit `roundStarted` with incremented round number.
 * 2. Delegate to `TimerController.startRound`.
 * 3. Emit `timerTick` on each tick and guard the expiration callback.
 *
 * @param {object} engine - Battle engine instance.
 * @param {function(number): void} onTick - Tick callback.
 * @param {function(): Promise<void>} onExpired - Expiration callback.
 * @param {number} [duration] - Timer duration in seconds.
 * @param {function(number): void} [onDrift] - Drift handler.
 * @returns {Promise<void>}
 */
export function startRoundTimer(engine, onTick, onExpired, duration, onDrift) {
  const round = engine.roundsPlayed + 1;
  engine.emit("roundStarted", { round });
  return engine.timer.startRound(
    (r) => {
      engine.emit("timerTick", { remaining: r, phase: "round" });
      if (typeof onTick === "function") onTick(r);
    },
    async () => {
      if (!engine.matchEnded && typeof onExpired === "function") await onExpired();
    },
    duration,
    onDrift
  );
}

/**
 * Start the cooldown timer between rounds.
 *
 * @pseudocode
 * 1. Delegate to `TimerController.startCoolDown`.
 * 2. Emit `timerTick` on each tick and guard the expiration callback.
 *
 * @param {object} engine - Battle engine instance.
 * @param {function(number): void} onTick - Tick callback.
 * @param {function(): (void|Promise<void>)} onExpired - Expiration callback.
 * @param {number} [duration] - Timer duration in seconds.
 * @param {function(number): void} [onDrift] - Drift handler.
 * @returns {Promise<void>}
 */
export function startCoolDownTimer(engine, onTick, onExpired, duration, onDrift) {
  return engine.timer.startCoolDown(
    (r) => {
      engine.emit("timerTick", { remaining: r, phase: "cooldown" });
      if (typeof onTick === "function") onTick(r);
    },
    async () => {
      if (!engine.matchEnded && typeof onExpired === "function") await onExpired();
    },
    duration,
    onDrift
  );
}

/**
 * Pause the active timer.
 *
 * @pseudocode
 * 1. Invoke `pause()` on the underlying timer.
 *
 * @param {object} engine - Battle engine instance.
 * @returns {void}
 */
export function pauseTimer(engine) {
  engine.timer.pause();
}

/**
 * Resume the active timer.
 *
 * @pseudocode
 * 1. Invoke `resume()` on the underlying timer.
 *
 * @param {object} engine - Battle engine instance.
 * @returns {void}
 */
export function resumeTimer(engine) {
  engine.timer.resume();
}

/**
 * Stop the active timer.
 *
 * @pseudocode
 * 1. Invoke `stop()` on the underlying timer.
 *
 * @param {object} engine - Battle engine instance.
 * @returns {void}
 */
export function stopTimer(engine) {
  engine.timer.stop();
}

/**
 * Mark the tab inactive and pause the timer.
 *
 * @pseudocode
 * 1. Pause the timer.
 * 2. Set `tabInactive` flag.
 *
 * @param {object} engine - Battle engine instance.
 * @returns {void}
 */
export function handleTabInactive(engine) {
  pauseTimer(engine);
  engine.tabInactive = true;
}

/**
 * Resume the timer if the tab becomes active.
 *
 * @pseudocode
 * 1. If previously inactive, resume timer and clear flag.
 *
 * @param {object} engine - Battle engine instance.
 * @returns {void}
 */
export function handleTabActive(engine) {
  if (engine.tabInactive) {
    resumeTimer(engine);
    engine.tabInactive = false;
  }
}

/**
 * Handle timer drift by stopping the timer and recording the amount.
 *
 * @pseudocode
 * 1. Stop the timer.
 * 2. Record the drift amount on the engine.
 *
 * @param {object} engine - Battle engine instance.
 * @param {number} driftAmount - Amount of drift detected.
 * @returns {void}
 */
export function handleTimerDrift(engine, driftAmount) {
  stopTimer(engine);
  engine.lastTimerDrift = driftAmount;
}
