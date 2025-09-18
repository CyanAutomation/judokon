import stateHandlers from "./stateHandlers.js";
import { autoContinue, setAutoContinue } from "./autoContinue.js";
/**
 * Re-export of the `stateHandlers` object, which maps battle state names
 * to their corresponding `onEnter` and `onExit` handler functions.
 *
 * @summary Provides a centralized collection of functions that define the
 * behavior of the battle orchestrator when entering or exiting specific states.
 *
 * @pseudocode
 * 1. Import `stateHandlers` from `./stateHandlers.js`.
 * 2. Re-export `stateHandlers` for use by the orchestrator.
 *
 * @type {Record<string, {onEnter?: Function, onExit?: Function}>}
 *
 * @returns {Record<string, {onEnter?: Function, onExit?: Function}>}
 */
export { stateHandlers };

/**
 * Controls whether the battle automatically proceeds to the next round/state.
 *
 * @summary Re-export of the `autoContinue` flag from `./autoContinue.js`.
 * When `true`, the battle will automatically advance after certain states
 * (e.g., `roundOver`). When `false`, it will pause, requiring explicit user
 * action or event dispatch to proceed.
 *
 * @pseudocode
 * 1. Re-export `autoContinue` from `./autoContinue.js`.
 * @type {boolean}
 * @returns {boolean}
 */
export { autoContinue };

/**
 * Sets the `autoContinue` flag.
 *
 * @summary Re-export of the `setAutoContinue` function from `./autoContinue.js`.
 * Use this function to enable or disable automatic progression of the battle.
 *
 * @pseudocode
 * 1. Re-export `setAutoContinue` from `./autoContinue.js`.
 * @param {boolean} val - The new value for `autoContinue`.
 * @returns {void}
 */
export { setAutoContinue };
export {
  computeAndDispatchOutcome,
  recordEntry,
  resolveSelectionIfPresent,
  waitForPlayerChoice,
  awaitPlayerChoice,
  guardSelectionResolution,
  schedulePostResolveWatchdog
} from "./stateHandlers/roundDecisionHelpers.js";
/**
 * Re-export the `waitingForMatchStartEnter` state handler.
 *
 * @summary Delegates to the implementation in `stateHandlers/waitingForMatchStartEnter.js`.
 *
 * @pseudocode
 * 1. Provide a named export so the orchestrator can import from a single facade.
 *
 * @returns {Promise<void>} Resolves when the handler completes its work.
 */
export { waitingForMatchStartEnter } from "./stateHandlers/waitingForMatchStartEnter.js";
/**
 * Handler for entering the `waitingForMatchStart` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `scoreboardClear` event to clear any previous scoreboard messages.
 * 3. Emit a `matchStartReady` event to signal that the match is ready to start.
 * 4. Emit a `scoreboardShowMessage` event to display a "Waiting for match start..." message.
 * 5. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { matchStartEnter } from "./stateHandlers/matchStartEnter.js";
/**
 * Handler for entering the `matchStart` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Get the battle engine from the context.
 * 3. Reset the game using `context.doResetGame()`.
 * 4. Emit a `scoreboardClear` event.
 * 5. Emit a `matchStart` event.
 * 6. Emit a `scoreboardShowMessage` event with "Match Start!".
 * 7. If `autoContinue` is enabled, dispatch a `startRound` event after a delay.
 * 8. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { cooldownEnter } from "./stateHandlers/cooldownEnter.js";
/**
 * Handler for entering the `cooldown` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Get the battle engine from the context.
 * 3. Start the cooldown period using `engine.startCoolDown()`.
 * 4. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { roundStartEnter } from "./stateHandlers/roundStartEnter.js";
/**
 * Handler for entering the `roundStart` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Get the battle engine from the context.
 * 3. Start the round using `context.doStartRound()`.
 * 4. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { waitingForPlayerActionEnter } from "./stateHandlers/waitingForPlayerActionEnter.js";
/**
 * Handler for entering the `waitingForPlayerAction` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `scoreboardClear` event.
 * 3. Emit a `roundReady` event.
 * 4. Emit a `scoreboardShowMessage` event with "Select a stat!".
 * 5. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { waitingForPlayerActionExit } from "./stateHandlers/waitingForPlayerActionExit.js";
/**
 * Handler for exiting the `waitingForPlayerAction` state.
 *
 * @pseudocode
 * 1. Log the exit from the state.
 * 2. Emit a `scoreboardClear` event.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { roundDecisionEnter } from "./stateHandlers/roundDecisionEnter.js";
/**
 * Handler for entering the `roundDecision` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `roundDecision` event.
 * 3. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { roundDecisionExit } from "./stateHandlers/roundDecisionExit.js";
/**
 * Handler for exiting the `roundDecision` state.
 *
 * @pseudocode
 * 1. Log the exit from the state.
 * 2. Emit a `scoreboardClear` event.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { roundOverEnter } from "./stateHandlers/roundOverEnter.js";
/**
 * Handler for entering the `roundOver` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `roundOver` event.
 * 3. If `autoContinue` is enabled, dispatch a `nextRound` event after a delay.
 * 4. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { matchDecisionEnter } from "./stateHandlers/matchDecisionEnter.js";
/**
 * Handler for entering the `matchDecision` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `matchDecision` event.
 * 3. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { matchOverEnter } from "./stateHandlers/matchOverEnter.js";
/**
 * Handler for entering the `matchOver` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `matchOver` event.
 * 3. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { interruptRoundEnter } from "./stateHandlers/interruptRoundEnter.js";
/**
 * Handler for entering the `interruptRound` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Get the battle engine from the context.
 * 3. Interrupt the match with reason "round".
 * 4. Emit a `scoreboardShowMessage` event with "Round Interrupted!".
 * 5. Emit a `roundInterrupted` event.
 * 6. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { interruptMatchEnter } from "./stateHandlers/interruptMatchEnter.js";
/**
 * Handler for entering the `interruptMatch` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Get the battle engine from the context.
 * 3. Interrupt the match with reason "match".
 * 4. Emit a `scoreboardShowMessage` event with "Match Interrupted!".
 * 5. Emit a `matchInterrupted` event.
 * 6. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)
export { roundModificationEnter } from "./stateHandlers/roundModificationEnter.js";
/**
 * Handler for entering the `roundModification` state.
 *
 * @pseudocode
 * 1. Log the entry into the state.
 * 2. Emit a `scoreboardShowMessage` event with "Round Modified!".
 * 3. Emit a `roundModified` event.
 * 4. Log the exit from the state.
 *
 * @param {object} context - The state machine context.
 * @returns {Promise<void>}
 */
// (Removed duplicate re-export)

/**
 * Look up the onEnter handler for a state.
 *
 * @pseudocode
 * 1. Return `stateHandlers[state]?.onEnter`.
 *
 * @param {string} state - State name.
 * @returns {Function|undefined} Handler function or undefined.
 */
/**
 * Look up the onEnter handler for a state.
 *
 * @param {string} state - State name.
 * @returns {Function|undefined} Handler function or undefined.
 * @summary Get the onEnter handler function for a specific battle state.
 * @pseudocode
 * 1. Look up the state in stateHandlers.
 * 2. Return the onEnter handler if it exists.
 * 3. Return undefined if no handler is found.
 */
export function getOnEnterHandler(state) {
  return stateHandlers[state]?.onEnter;
}

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
