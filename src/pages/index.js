/**
 * Re-exports the internal test helper object for the Battle CLI module.
 *
 * @summary This export provides automated tests with direct access to internal
 * functions and state of the Battle CLI for more granular control and assertions.
 *
 * @pseudocode
 * 1. The `__test` object, which contains various test-specific utilities and internal references, is imported from `./battleCLI/init.js`.
 * 2. This `__test` object is then re-exported under the alias `battleCLI`.
 * 3. Automated tests can import `battleCLI` from this module to interact with the Battle CLI's internals.
 * @returns {void}
 */
export { __test as battleCLI } from "./battleCLI/init.js";

/**
 * Re-exports the `setupFlags` helper function from the Battle CLI initializer.
 *
 * @summary This export provides a convenient way to access the function
 * responsible for initializing and configuring feature flags within the
 * Battle CLI environment.
 *
 * @pseudocode
 * 1. The `setupFlags` function is imported from `./battleCLI/init.js`.
 * 2. It is then re-exported directly from this module.
 * 3. Callers can use this export to programmatically set up feature flags for the Battle CLI.
 * @returns {void}
 */
export { setupFlags } from "./battleCLI/init.js";

/**
 * Re-exports the `wireEvents` helper function from the Battle CLI initializer.
 *
 * @summary This export provides a convenient way to access the function
 * responsible for attaching global event listeners to the Battle CLI page.
 *
 * @pseudocode
 * 1. The `wireEvents` function is imported from `./battleCLI/init.js`.
 * 2. It is then re-exported directly from this module.
 * 3. Callers can use this export to programmatically set up event handling for the Battle CLI.
 * @returns {void}
 */
export { wireEvents } from "./battleCLI/init.js";

/**
 * Re-exports the `subscribeEngine` helper function from the Battle CLI initializer.
 *
 * @summary This export provides a convenient way to access the function
 * responsible for subscribing UI components to events emitted by the battle engine.
 *
 * @pseudocode
 * 1. The `subscribeEngine` function is imported from `./battleCLI/init.js`.
 * 2. It is then re-exported directly from this module.
 * 3. Callers can use this export to programmatically set up event subscriptions for the Battle CLI.
 * @returns {void}
 */
export { subscribeEngine } from "./battleCLI/init.js";

/**
 * Re-exports the global keydown event handler for the Battle CLI page.
 *
 * @summary This export provides a convenient way to access the function
 * responsible for processing keyboard input across the Battle CLI.
 *
 * @pseudocode
 * 1. The `onKeyDown` function is imported from `./battleCLI/events.js`.
 * 2. It is then re-exported directly from this module.
 * 3. External modules (e.g., test suites or custom bootstrappers) can attach this function as a global keydown listener.
 * @returns {void}
 */
export { onKeyDown } from "./battleCLI/events.js";

/**
 * Re-exports a promise helper that resolves when the Escape key press is
 * handled within the Battle CLI.
 *
 * @summary This export provides a mechanism for external code (e.g., tests)
 * to await the completion of Escape key handling logic in the CLI.
 *
 * @pseudocode
 * 1. The `getEscapeHandledPromise` function is imported from `./battleCLI/state.js`.
 * 2. It is then re-exported directly from this module.
 * 3. Callers can use this export to obtain a promise that resolves once the CLI has processed an Escape key event.
 * @returns {Promise<void>}
 */
export { getEscapeHandledPromise } from "./battleCLI/state.js";
