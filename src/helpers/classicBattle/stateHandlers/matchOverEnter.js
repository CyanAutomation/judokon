import { emitBattleEvent } from "../battleEvents.js";
import { reportSentryError } from "./sentryReporter.js";

/**
 * onEnter handler for the `matchOver` state.
 *
 * Signals the end of a match by emitting a matchOver event with final
 * outcome and scores. This follows the matchDecision state and allows
 * listeners to perform any final cleanup or logging.
 *
 * @param {import("../stateManager.js").ClassicBattleStateManager} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Extract match outcome and scores from store or machine context.
 * 2. Emit `matchOver` event with outcome, winner, and final scores.
 * 3. Capture any errors to Sentry for observability.
 */
export async function matchOverEnter(machine) {
  try {
    const store = machine?.context?.store ?? {};
    const detail = store.matchOutcome ?? {};

    emitBattleEvent("matchOver", {
      outcome: detail.outcome,
      winner: detail.winner,
      scores: detail.scores,
      timestamp: Date.now()
    });
  } catch (error) {
    reportSentryError(error, {
      contexts: { location: "matchOverEnter" }
    });
  }
}

export default matchOverEnter;
