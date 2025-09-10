/**
 * Public entry re-export for the Battle CLI page initializer.
 *
 * @description
 * This module re-exports the `init` function from `./battleCLI/init.js` so
 * the page entry point can be imported from a stable path. Tests import this
 * symbol to trigger page initialization programmatically.
 *
 * @pseudocode
 * 1. Import `init` from `./battleCLI/init.js`.
 * 2. Re-export it unchanged so callers can call `init()` to bootstrap the page.
 */
export { init } from "./battleCLI/init.js";
