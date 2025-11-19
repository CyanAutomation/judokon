/**
 * @summary Round counter tracking and synchronization from engine state.
 * @description Encapsulates all round display logic including highest-round tracking,
 * forced advancement guards, and engine synchronization.
 */

import {
  getHighestDisplayedRound as getHighestRoundGlobal,
  setHighestDisplayedRound as setHighestRoundGlobal
} from "./globalState.js";
import { getRoundsPlayed } from "../battleEngineFacade.js";

let lastForcedTargetRound = null;
let lastRoundCounterUpdateContext = "init";

/**
 * Get the round number currently shown on the scoreboard.
 *
 * @returns {number|null} Parsed round number or null if unavailable.
 *
 * @pseudocode
 * 1. Get the round-counter element from DOM.
 * 2. Extract text content and match against round number pattern.
 * 3. Parse and validate the number, returning null if invalid.
 */
export function getVisibleRoundNumber() {
  try {
    const el = document.getElementById("round-counter");
    if (!el) return null;
    const match = String(el.textContent || "").match(/Round\s+(\d+)/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Compute the next round value from engine state.
 *
 * @returns {number} Computed engine round (rounds played + 1).
 */
function calculateEngineRound() {
  const played = Number(getRoundsPlayed?.() || 0);
  return Number.isFinite(played) ? played + 1 : NaN;
}

/**
 * Compute the lowest acceptable round to render.
 *
 * @pseudocode
 * 1. Use the tracked highest round when available; otherwise fall back to 1.
 * 2. Use the visible round when present; otherwise fall back to 1.
 * 3. Return the max of those candidates.
 */
function computeBaselineRound(hasHighestRound, highestRound, hasVisibleRound, visibleRound) {
  const highest = hasHighestRound ? highestRound : 1;
  const visible = hasVisibleRound ? Number(visibleRound) : 1;
  return Math.max(highest, visible);
}

/**
 * Determine whether forced advancement should apply for this update.
 *
 * @pseudocode
 * 1. Require an expected advance with a visible round already shown.
 * 2. Ensure the engine has not yet caught up to the visible round.
 * 3. Prevent forcing past any previously coerced round target.
 *
 * @param {boolean} expectAdvance - Whether the caller expects a visible advance.
 * @param {boolean} hasVisibleRound - Whether a round is already displayed.
 * @param {boolean} hasEngineRound - Whether the engine reported a round.
 * @param {number} engineRound - Round value read from the engine.
 * @param {number|null} visibleRound - Round value currently shown.
 * @param {boolean} forceWhenEngineMatchesVisible - Whether to advance when engine matches visible round.
 * @returns {boolean} True when the UI should coerce the next round.
 */
function shouldForceAdvancement(
  expectAdvance,
  hasVisibleRound,
  hasEngineRound,
  engineRound,
  visibleRound,
  forceWhenEngineMatchesVisible
) {
  const engineLagging = !hasEngineRound || engineRound < Number(visibleRound);
  const engineMatching = forceWhenEngineMatchesVisible && engineRound === Number(visibleRound);
  return (
    expectAdvance &&
    hasVisibleRound &&
    (engineLagging || engineMatching) &&
    (lastForcedTargetRound === null || Number(visibleRound) < lastForcedTargetRound)
  );
}

/**
 * Determine the next round to display and whether it was forced.
 *
 * @param {Object} options - Configuration options.
 * @param {boolean} options.expectAdvance - Whether advancement is expected.
 * @param {boolean} options.hasVisibleRound - Whether a round is currently displayed.
 * @param {boolean} options.hasEngineRound - Whether the engine reported a round.
 * @param {number} options.engineRound - Round value from the engine.
 * @param {number|null} options.visibleRound - Currently displayed round.
 * @param {number} options.baselineRound - Minimum acceptable round.
 * @param {boolean} [options.forceWhenEngineMatchesVisible=false] - Force advancement when engine matches visible.
 * @returns {Object} Object with nextRound and forceAdvance properties.
 */
function resolveNextRound({
  expectAdvance,
  hasVisibleRound,
  hasEngineRound,
  engineRound,
  visibleRound,
  baselineRound,
  forceWhenEngineMatchesVisible = false
}) {
  let nextRound = hasEngineRound ? engineRound : baselineRound;
  const forceAdvance = shouldForceAdvancement(
    expectAdvance,
    hasVisibleRound,
    hasEngineRound,
    engineRound,
    visibleRound,
    forceWhenEngineMatchesVisible
  );

  if (forceAdvance) {
    const forcedTarget = Math.max(Number(visibleRound) + 1, baselineRound);
    nextRound = Math.max(nextRound, forcedTarget);
  } else {
    nextRound = Math.max(nextRound, baselineRound);
  }

  return { nextRound, forceAdvance };
}

/**
 * Update global tracking state after rendering a new round.
 *
 * @pseudocode
 * 1. Raise the recorded highest displayed round when necessary.
 * 2. Maintain forced advancement guards based on the latest outcome.
 * 3. Record the active update context for debug instrumentation.
 */
function updateRoundCounterState({
  nextRound,
  expectAdvance,
  shouldForceAdvance,
  hasEngineRound,
  engineRound,
  priorContext
}) {
  try {
    if (typeof window !== "undefined" && window.__DEBUG_ROUND_TRACKING) {
      console.debug("[round-tracking] updateRoundCounterState", {
        nextRound,
        prevGlobal: window.__highestDisplayedRound,
        expectAdvance,
        shouldForceAdvance,
        engineRound,
        priorContext
      });
    }
  } catch {}

  const newHighest = Math.max(getHighestRoundGlobal(), nextRound);
  setHighestRoundGlobal(newHighest);

  if (shouldForceAdvance) {
    lastForcedTargetRound = nextRound;
  } else if (!expectAdvance || (hasEngineRound && engineRound >= nextRound)) {
    lastForcedTargetRound = null;
  }

  lastRoundCounterUpdateContext = expectAdvance ? "advance" : "regular";

  if (typeof window !== "undefined") {
    try {
      window.__highestDisplayedRound = getHighestRoundGlobal();
      window.__lastRoundCounterContext = lastRoundCounterUpdateContext;
      window.__previousRoundCounterContext = priorContext;
    } catch {}
  }
}

/**
 * Update the round counter from engine state.
 *
 * @param {Object} [options={}] - Configuration flags for this update.
 * @param {boolean} [options.expectAdvance=false] - Whether the caller expects an advance.
 * @param {Function} [options.updateRoundCounterFn] - Function to call with the next round value.
 * @param {boolean} [options.forceWhenEngineMatchesVisible=false] - Force advancement when engine matches visible.
 *
 * @pseudocode
 * 1. Read `getRoundsPlayed()` and compute `played + 1` when possible.
 * 2. Track the highest round shown so far and never render a lower value.
 * 3. When `expectAdvance` is true and the engine still reports the prior total,
 *    increment from the visible round so early signals progress.
 * 4. When a selection was just made, force advancement even if engine matches visible.
 * 5. Fall back to the last known round (or 1) when engine data is unavailable.
 */
export function updateRoundCounterFromEngine(options = {}) {
  const {
    expectAdvance = false,
    updateRoundCounterFn = null,
    forceWhenEngineMatchesVisible = false
  } = options;

  const visibleRound = getVisibleRoundNumber();
  const hasVisibleRound = Number.isFinite(visibleRound) && visibleRound >= 1;

  if (hasVisibleRound) {
    setHighestRoundGlobal(Math.max(getHighestRoundGlobal(), Number(visibleRound)));
  }

  const priorContext = lastRoundCounterUpdateContext;

  try {
    const engineRound = calculateEngineRound();
    const hasEngineRound = Number.isFinite(engineRound) && engineRound >= 1;
    const hasHighestRound =
      Number.isFinite(getHighestRoundGlobal()) && getHighestRoundGlobal() >= 1;
    const baselineRound = computeBaselineRound(
      hasHighestRound,
      getHighestRoundGlobal(),
      hasVisibleRound,
      visibleRound
    );

    const { nextRound, forceAdvance } = resolveNextRound({
      expectAdvance,
      hasVisibleRound,
      hasEngineRound,
      engineRound,
      visibleRound,
      baselineRound,
      forceWhenEngineMatchesVisible
    });

    if (typeof window !== "undefined" && window.__DEBUG_ROUND_TRACKING) {
      try {
        console.debug("[RTRACE] updateRoundCounterFromEngine -> nextRound", {
          nextRound,
          engineRound,
          getRoundsPlayed: typeof getRoundsPlayed === "function" ? getRoundsPlayed() : undefined
        });
      } catch {}
    }

    if (updateRoundCounterFn && typeof updateRoundCounterFn === "function") {
      updateRoundCounterFn(nextRound);
    }

    updateRoundCounterState({
      nextRound,
      expectAdvance,
      shouldForceAdvance: forceAdvance,
      hasEngineRound,
      engineRound,
      priorContext
    });
  } catch (err) {
    console.debug("battleClassic: getRoundsPlayed failed", err);
    handleRoundCounterFallback(visibleRound, updateRoundCounterFn);
    lastRoundCounterUpdateContext = "fallback";
  }
}

/**
 * Handle fallback when round counter update fails.
 *
 * @private
 */
function handleRoundCounterFallback(visibleRound, updateRoundCounterFn) {
  try {
    const hasVisibleRound = Number.isFinite(visibleRound) && visibleRound >= 1;
    const baseline =
      Number.isFinite(getHighestRoundGlobal()) && getHighestRoundGlobal() >= 1
        ? getHighestRoundGlobal()
        : 1;
    const fallback = hasVisibleRound ? Math.max(Number(visibleRound), baseline) : baseline;

    if (updateRoundCounterFn && typeof updateRoundCounterFn === "function") {
      updateRoundCounterFn(fallback);
    }

    setHighestRoundGlobal(Math.max(getHighestRoundGlobal(), fallback));
    lastForcedTargetRound = null;

    if (typeof window !== "undefined") {
      try {
        window.__highestDisplayedRound = getHighestRoundGlobal();
        window.__lastRoundCounterContext = "fallback";
        window.__previousRoundCounterContext = lastRoundCounterUpdateContext;
      } catch {}
    }
  } catch (err2) {
    console.debug("battleClassic: updateRoundCounter fallback failed", err2);
  }
}

/**
 * Reset round counter tracking state to the initial baseline.
 *
 * @pseudocode
 * 1. Zero out highest round and forced target tracking.
 * 2. Restore the update context to "init".
 * 3. Sync diagnostic globals for test introspection.
 */
export function resetRoundCounterTracking() {
  setHighestRoundGlobal(0);
  lastForcedTargetRound = null;
  lastRoundCounterUpdateContext = "init";

  if (typeof window !== "undefined") {
    try {
      window.__highestDisplayedRound = getHighestRoundGlobal();
      window.__lastRoundCounterContext = lastRoundCounterUpdateContext;
      window.__previousRoundCounterContext = null;
    } catch {}
  }
}
