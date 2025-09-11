/**
 * Test helper re-export for the battle CLI module used by automated tests.
 *
 * @pseudocode
 * 1. Re-export the internal `__test` helper as `battleCLI` for tests.
 */
export { __test as battleCLI } from "./battleCLI/init.js";

/**
 * Re-export the `setupFlags` helper from the battle CLI initializer.
 *
 * @pseudocode
 * 1. Export `setupFlags` so callers can initialize feature flags.
 */
export { setupFlags } from "./battleCLI/init.js";

/**
 * Re-export the `wireEvents` helper from the battle CLI initializer.
 *
 * @pseudocode
 * 1. Export `wireEvents` so callers can attach event listeners.
 */
export { wireEvents } from "./battleCLI/init.js";

/**
 * Re-export the `subscribeEngine` helper from the battle CLI initializer.
 *
 * @pseudocode
 * 1. Export `subscribeEngine` so callers can subscribe to engine events.
 */
export { subscribeEngine } from "./battleCLI/init.js";

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
