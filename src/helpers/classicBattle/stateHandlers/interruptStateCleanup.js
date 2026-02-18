import { pauseTimer, resumeTimer, getTimerState } from "../../BattleEngine.js";
import { cleanupTimers, logSelectionMutation } from "../selectionHandler.js";
import { debugLog } from "../debugLog.js";
import { resetSelectionFinalized } from "../selectionState.js";

const INTERRUPT_RESUME_EVENTS = new Set(["restartRound", "restartMatch"]);

function snapshotTimerState() {
  try {
    const timerState = typeof getTimerState === "function" ? getTimerState() : null;
    if (!timerState || typeof timerState !== "object") {
      return null;
    }
    return {
      remaining: Number(timerState.remaining) || 0,
      paused: Boolean(timerState.paused),
      category: timerState.category ?? null,
      pauseOnHidden: Boolean(timerState.pauseOnHidden)
    };
  } catch (err) {
    debugLog("Failed to snapshot timer state during interrupt:", err);
    return null;
  }
}

function freezeTimerWithSnapshot() {
  const timer = snapshotTimerState();
  try {
    pauseTimer();
  } catch (err) {
    debugLog("Failed to pause timer during interrupt:", err);
  }
  return timer;
}

function buildResumeContext({ payload, timerSnapshot, resumeTarget }) {
  return {
    reason: payload?.reason ?? null,
    raisedAtMs: Date.now(),
    resumeTarget,
    timerSnapshot,
    inputFrozen: true
  };
}

function setInterruptResumeContext(store, resumeContext) {
  if (!store || typeof store !== "object") {
    return;
  }
  store.inputAccepted = false;
  store.interruptResumeContext = resumeContext;
}

function clearInterruptResumeContext(store) {
  if (!store || typeof store !== "object") {
    return;
  }
  store.inputAccepted = true;
  store.interruptResumeContext = null;
}

function restoreFrozenTimer(resumeContext, resolutionEvent) {
  if (!INTERRUPT_RESUME_EVENTS.has(resolutionEvent)) {
    return false;
  }
  const remaining = Number(resumeContext?.timerSnapshot?.remaining) || 0;
  if (remaining <= 0) {
    return false;
  }
  try {
    resumeTimer();
    return true;
  } catch (err) {
    debugLog("Failed to resume timer after interrupt:", err);
    return false;
  }
}

/**
 * Capture and freeze interrupt context so state handlers can resolve deterministically.
 *
 * @param {object} [store] - Battle state store.
 * @param {object} [payload] - Interrupt payload.
 * @param {string} [resumeTarget] - Deterministic state name that resolution will target.
 * @returns {{reason: string|null, raisedAtMs: number, resumeTarget: string|undefined, timerSnapshot: object|null, inputFrozen: boolean}|null}
 * @pseudocode
 * 1. Read and normalize current timer state snapshot.
 * 2. Pause the active engine timer to freeze countdown progress.
 * 3. Build deterministic resume metadata with target and reason.
 * 4. Persist frozen input/timer context onto the store.
 */
export function freezeInterruptContext(store, payload, resumeTarget) {
  const timerSnapshot = freezeTimerWithSnapshot();
  const resumeContext = buildResumeContext({ payload, timerSnapshot, resumeTarget });
  setInterruptResumeContext(store, resumeContext);
  return resumeContext;
}

/**
 * Resolve persisted interrupt context and restore timer/input state when applicable.
 *
 * @param {object} [store] - Battle state store.
 * @param {string|null} [resolutionEvent] - Event used to resolve interrupt flow.
 * @returns {{resumeTarget: string|null, restoredTimer: boolean, timerSnapshot: object|null}|null}
 * @pseudocode
 * 1. Read persisted interrupt resume context from the store.
 * 2. Conditionally resume timer for resumable resolution events.
 * 3. Build deterministic resolution payload with resume target/timer snapshot.
 * 4. Unfreeze input acceptance and clear persisted resume context.
 */
export function resolveInterruptContext(store, resolutionEvent) {
  const resumeContext = store?.interruptResumeContext;
  if (!resumeContext || typeof resumeContext !== "object") {
    return null;
  }
  const restoredTimer = restoreFrozenTimer(resumeContext, resolutionEvent);
  const resolutionDetail = {
    resumeTarget: resumeContext.resumeTarget ?? null,
    restoredTimer,
    timerSnapshot: resumeContext.timerSnapshot ?? null
  };
  clearInterruptResumeContext(store);
  return resolutionDetail;
}

/**
 * Shared cleanup utility for match and round interrupts.
 *
 * @param {object} [store] - Battle state store to clean up. May be null/undefined.
 * @param {object} [options] - Configuration options.
 * @param {boolean} [options.resetSelectionState=true] - Clears `playerChoice`, `selectionMade`, and
 *   `__lastSelectionMade`. Keep the default (`true`) for round interrupts so the next round never
 *   inherits stale selections; set to `false` only when a match-level interrupt needs to preserve
 *   the last selection for debugging or post-match analysis.
 * @returns {void}
 * @pseudocode
 * 1. Clear any active timers to prevent stale callbacks.
 * 2. Reset or preserve selection fields according to `resetSelectionState`.
 * 3. Clear window instrumentation flags; log and suppress any errors.
 * @description
 * @note This function will never throw - all errors are logged and suppressed to ensure interrupt
 *       handlers always succeed.
 */
export function cleanupInterruptState(store, { resetSelectionState = true } = {}) {
  // Clear any running timers to prevent stale callbacks
  // (Defensive check: cleanupTimers handles null internally, but fail early to prevent propagation)
  if (store) {
    try {
      cleanupTimers(store, { preserveEngineTimer: true });
    } catch (err) {
      debugLog("Timer cleanup failed during interrupt:", err);
    }
  }

  // Reset player choice and selection state unless explicitly preserved
  // (Required check: direct property assignment needs non-null store)
  if (store) {
    try {
      if (resetSelectionState) {
        // playerChoice: The stat key selected by the player (e.g., 'power', 'speed')
        store.playerChoice = null;
        // selectionMade: Whether the player has completed stat selection
        store.selectionMade = false;
        // __lastSelectionMade: Finalization state to prevent duplicate selection processing
        store.__lastSelectionMade = false;
        logSelectionMutation("interrupt.cleanup.reset", store);
      } else {
        logSelectionMutation("interrupt.cleanup.preserve", store);
      }
    } catch (err) {
      debugLog("Player state cleanup failed during interrupt:", err);
    }
  }

  // Clear window instrumentation properties (always attempt - separate from store)
  // Window properties are test/debug-only and don't require store context, so cleanup
  // happens unconditionally. These track selection finalization state during browser tests.
  try {
    // Use unified selection state API (store.selectionMade is source of truth)
    resetSelectionFinalized(store);
  } catch (err) {
    debugLog("Window instrumentation cleanup failed during interrupt:", err);
  }
}
