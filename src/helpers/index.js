/**
 * Re-exports core battle engine functionalities for convenient access.
 *
 * @summary This module provides a centralized point of access to key functions
 * and classes from the `BattleEngine` module, simplifying imports for consumers.
 *
 * @pseudocode
 * 1. Import `compareStats`, `determineOutcome`, `applyOutcome`, and `BattleEngine` from `./BattleEngine.js`.
 * 2. Re-export these symbols to make them directly available from this module.
 *
 * @exports compareStats {function} Compares two stat values and returns their difference.
 * @exports determineOutcome {function} Determines the outcome of a battle round based on stat comparison.
 * @exports applyOutcome {function} Applies the outcome of a battle round to the game state.
 * @exports BattleEngine {class} The main class for managing battle logic and state.
 * @returns {void}
 */

export { compareStats, determineOutcome, applyOutcome, BattleEngine } from "./BattleEngine.js";
