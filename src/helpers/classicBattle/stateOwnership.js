/**
 * @summary Canonical state ownership contracts for Classic Battle.
 *
 * Domain progression (selection/evaluation/cooldown/end) is authoritative in the
 * orchestrator + engine state machine. The battle store is only a UI/session
 * projection that mirrors domain outcomes for rendering, diagnostics, and tests.
 *
 * @pseudocode
 * 1. Declare projection field groups for view/session mirrors.
 * 2. Define authoritative state expectations per machine state.
 * 3. Reconcile conflicting projection writes so UI state cannot override domain flow.
 */

/**
 * @summary Store fields that are UI/view projection only.
 * @type {ReadonlyArray<string>}
 */
export const VIEW_PROJECTION_FIELDS = Object.freeze([
  "selectionMade",
  "roundReadyForInput",
  "playerChoice",
  "stallTimeoutMs",
  "autoSelectId",
  "autoSelectCountdownId",
  "autoSelectExecuteId",
  "autoSelectRoundToken",
  "autoSelectScheduleNonce",
  "playerCardEl",
  "opponentCardEl",
  "statButtonEls"
]);

/**
 * @summary Store fields that mirror per-match session data for view diagnostics.
 * @type {ReadonlyArray<string>}
 */
export const SESSION_PROJECTION_FIELDS = Object.freeze([
  "currentPlayerJudoka",
  "currentOpponentJudoka",
  "lastPlayerStats",
  "lastOpponentStats",
  "matchDeck",
  "matchDeckSize",
  "pendingOpponentFromDeck",
  "usedOpponentIds",
  "roundsPlayed"
]);

const selectionStates = new Set(["roundSelect", "roundResolve"]);

function expectedProjectionForState(state) {
  const inSelectionPhase = selectionStates.has(state);
  return {
    selectionMade: inSelectionPhase ? undefined : false,
    playerChoice: inSelectionPhase ? undefined : null,
    roundReadyForInput: state === "roundSelect"
  };
}

function valuesEqual(a, b) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return a === b;
}

/**
 * @summary Enforce orchestrator authority by reconciling conflicting store projection values.
 *
 * @pseudocode
 * 1. Build expected projection values from target machine state.
 * 2. Compare current store projection values against authoritative expectations.
 * 3. Overwrite conflicting projection values and return correction metadata.
 *
 * @param {object|null|undefined} store - Projection store attached to machine context.
 * @param {string} state - Target machine state after transition.
 * @returns {{corrected: Array<{field: string, attempted: any, enforced: any}>}}
 */
export function reconcileProjectionAuthority(store, state) {
  if (!store || typeof store !== "object") {
    return { corrected: [] };
  }

  const expected = expectedProjectionForState(state);
  const corrected = [];

  for (const [field, enforced] of Object.entries(expected)) {
    if (enforced === undefined) {
      continue;
    }

    const attempted = store[field];
    if (valuesEqual(attempted, enforced)) {
      continue;
    }

    store[field] = enforced;
    corrected.push({ field, attempted, enforced });
  }

  return { corrected };
}
