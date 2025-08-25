/**
 * Battle helpers facade.
 *
 * @pseudocode
 * 1. Re-export small battle-related utilities so callers import from a single module.
 * 2. Keep this file intentionally minimal to avoid circular imports.
 */
export * from "./score.js";
export * from "./battleUI.js";
