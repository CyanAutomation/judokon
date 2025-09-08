/**
 * Re-export of the battle CLI test helper used in automated tests.
 *
 * @pseudocode
 * 1. Import the internal `__test` export from `battleCLI.js` and re-export it
 *    under the name `battleCLI` so tests can import it from the public entry.
 */
/**
 * Test helper re-export for the battle CLI module used by automated tests.
 *
 * @pseudocode
 * 1. Re-export the internal `__test` helper as `battleCLI` for tests.
 */
export { __test as battleCLI } from "./battleCLI.js";

/**
 * Re-export the global key handler for the battle CLI page.
 *
 * @pseudocode
 * 1. Re-export `onKeyDown` so external callers (tests/bootstrappers) can attach it.
 */
export { onKeyDown } from "./battleCLI/events.js";

/**
 * Re-export a promise helper that resolves when Escape is handled in the CLI.
 *
 * @pseudocode
 * 1. Re-export `getEscapeHandledPromise` from the battle CLI state module.
 */
export { getEscapeHandledPromise } from "./battleCLI/state.js";
