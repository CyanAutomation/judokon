import stateHandlers from "./stateHandlers.js";
export { stateHandlers };

export { autoContinue, setAutoContinue } from "./autoContinue.js";
export {
  computeAndDispatchOutcome,
  recordEntry,
  resolveSelectionIfPresent,
  waitForPlayerChoice,
  awaitPlayerChoice,
  guardSelectionResolution,
  schedulePostResolveWatchdog
} from "./stateHandlers/roundDecisionHelpers.js";
export { waitingForMatchStartEnter } from "./stateHandlers/waitingForMatchStartEnter.js";
export { matchStartEnter } from "./stateHandlers/matchStartEnter.js";
export { cooldownEnter } from "./stateHandlers/cooldownEnter.js";
export { roundStartEnter } from "./stateHandlers/roundStartEnter.js";
export { waitingForPlayerActionEnter } from "./stateHandlers/waitingForPlayerActionEnter.js";
export { waitingForPlayerActionExit } from "./stateHandlers/waitingForPlayerActionExit.js";
export { roundDecisionEnter } from "./stateHandlers/roundDecisionEnter.js";
export { roundDecisionExit } from "./stateHandlers/roundDecisionExit.js";
export { roundOverEnter } from "./stateHandlers/roundOverEnter.js";
export { matchDecisionEnter } from "./stateHandlers/matchDecisionEnter.js";
export { matchOverEnter } from "./stateHandlers/matchOverEnter.js";
export { interruptRoundEnter } from "./stateHandlers/interruptRoundEnter.js";
export { interruptMatchEnter } from "./stateHandlers/interruptMatchEnter.js";
export { roundModificationEnter } from "./stateHandlers/roundModificationEnter.js";

/**
 * Lookup onEnter handler for a state.
 *
 * @param {string} state
 * @returns {Function|undefined}
 */
/**
 * Look up the onEnter handler for a state.
 *
 * @pseudocode
 * 1. Return `stateHandlers[state]?.onEnter`.
 *
 * @param {string} state - State name.
 * @returns {Function|undefined} Handler function or undefined.
 */
export function getOnEnterHandler(state) {
  return stateHandlers[state]?.onEnter;
}

/**
 * Lookup onExit handler for a state.
 *
 * @param {string} state
 * @returns {Function|undefined}
 */
/**
 * Look up the onExit handler for a state.
 *
 * @pseudocode
 * 1. Return `stateHandlers[state]?.onExit`.
 *
 * @param {string} state - State name.
 * @returns {Function|undefined} Handler function or undefined.
 */
export function getOnExitHandler(state) {
  return stateHandlers[state]?.onExit;
}
