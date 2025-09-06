/**
 * Re-export of the battle CLI test helper used in automated tests.
 *
 * @pseudocode
 * 1. Import the internal `__test` export from `battleCLI.js` and re-export it
 *    under the name `battleCLI` so tests can import it from the public entry.
 */
export { __test as battleCLI } from "./battleCLI.js";
export { onKeyDown } from "./battleCLI/events.js";
export { getEscapeHandledPromise } from "./battleCLI/state.js";
