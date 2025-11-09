import { startCooldown } from "../roundManager.js";
import { initStartCooldown } from "../cooldowns.js";
import { exposeDebugState } from "../debugHooks.js";
import { debugLog } from "../debugLog.js";
import { roundStore } from "../roundStore.js";

/**
 * Mark cooldownEnter handler invocation in debug window (test-only).
 *
 * @pseudocode
 * 1. Check if window is available.
 * 2. Set debug flag on globalThis.
 * 3. Silently fail if window unavailable or assignment blocked.
 *
 * @returns {void}
 */
function markDebugCooldownEntered() {
  try {
    if (typeof window !== "undefined") {
      window.__cooldownEnterInvoked = true;
    }
  } catch {}
}

/**
 * Set up debug state for cooldown entry (test instrumentation).
 *
 * @pseudocode
 * 1. Log handler invocation with payload info.
 * 2. Mark debug window state.
 * 3. Expose debug state via hook.
 *
 * @param {object} [payload] - Optional transition payload.
 * @returns {void}
 */
function setupDebugState(payload) {
  debugLog("cooldownEnter: handler invoked", { hasInitialPayload: !!payload?.initial });
  markDebugCooldownEntered();
  exposeDebugState("cooldownEnterInvoked", true);
}

/**
 * Check if a round object has a valid round number.
 *
 * @pseudocode
 * 1. Verify round exists and has numeric number property.
 * 2. Ensure number is finite and >= 1.
 * 3. Return validation result.
 *
 * @param {object} round - Round object to validate.
 * @returns {boolean} True if round has valid number >= 1.
 */
function isValidRound(round) {
  return (
    round && typeof round.number === "number" && Number.isFinite(round.number) && round.number >= 1
  );
}

/**
 * Compute the next round number based on current round.
 *
 * @pseudocode
 * 1. Check if current round is valid.
 * 2. If not valid, log warning and return 1.
 * 3. Otherwise return current.number + 1.
 *
 * @param {object} currentRound - Current round object.
 * @returns {number} Next round number (>= 1).
 */
function computeNextRoundNumber(currentRound) {
  if (!isValidRound(currentRound)) {
    debugLog("cooldownEnter: current round invalid, defaulting next round to 1");
    return 1;
  }
  return currentRound.number + 1;
}

/**
 * Safely execute a round store operation with error handling.
 *
 * @pseudocode
 * 1. Execute the operation function.
 * 2. If error occurs, log failure with operation name.
 * 3. Silently continue on error (non-fatal).
 *
 * @param {Function} operation - Function to execute.
 * @param {string} operationName - Human-readable name of operation for logging.
 * @returns {void}
 */
function safeRoundStoreOperation(operation, operationName) {
  try {
    operation();
  } catch (error) {
    debugLog(`cooldownEnter: failed to ${operationName} - ${error.message}`);
  }
}

/**
 * onEnter handler for `cooldown` state.
 *
 * @pseudocode
 * 1. Set up debug state.
 * 2. If `payload.initial` -> start match countdown.
 * 3. Otherwise schedule inter-round cooldown.
 * 4. Update round state and compute next round number.
 *
 * @param {object} machine - State machine context with store and scheduler.
 * @param {object} [payload] - Optional transition payload.
 * @param {boolean} [payload.initial] - If true, start match cooldown; otherwise inter-round.
 * @returns {Promise<void>}
 */
export async function cooldownEnter(machine, payload) {
  setupDebugState(payload);

  if (payload?.initial) {
    await initStartCooldown(machine);
    return;
  }

  // Pass scheduler from context if present
  const { store, scheduler } = machine.context || {};
  // In test environments, assume orchestrated context
  const context = { orchestrated: true };

  debugLog("cooldownEnter: about to call startCooldown");
  await startCooldown(store, scheduler, {
    isOrchestrated: () => context.orchestrated,
    getClassicBattleMachine: () => machine
  });
  debugLog("cooldownEnter: startCooldown completed");

  // Update round state
  safeRoundStoreOperation(() => {
    roundStore.setRoundState("cooldown", "cooldownEnter");
  }, "set round state");

  // Compute and set next round number
  safeRoundStoreOperation(() => {
    const nextRoundNumber = computeNextRoundNumber(roundStore.getCurrentRound());
    roundStore.setRoundNumber(nextRoundNumber);
  }, "set round number");
}
