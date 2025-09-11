/**
 * Public entry re-export for the Battle CLI page initializer.
 *
 * @summary This module provides a stable import path for the `init` function
 * that bootstraps the Battle CLI page.
 *
 * @description
 * The `init` function, originally defined in `./battleCLI/init.js`, is
 * re-exported here. This allows other modules and test suites to
 * programmatically trigger the initialization of the Battle CLI UI and logic
 * by simply importing and calling `init()`.
 *
 * @pseudocode
 * 1. The `init` function is imported from the `./battleCLI/init.js` module.
 * 2. This imported `init` function is then re-exported directly from this module.
 * 3. Consumers can now import `init` from this module and call it to start the Battle CLI application.
 *
 * @returns {Promise<void>} A promise that resolves when the Battle CLI page is fully initialized.
 */
export { init } from "./battleCLI/init.js";
