export * from "./applyInitialValues.js";
export * from "./listenerUtils.js";
export * from "./gameModeSwitches.js";
export * from "./featureFlagSwitches.js";
export * from "./makeHandleUpdate.js";

/**
 * Settings helpers barrel module.
 *
 * @pseudocode
 * 1. Re-export modular helpers used by the Settings page (rendering and persistence).
 * 2. Keep this file minimal so imports elsewhere can reference a single stable path.
 */
/**
 * Initialize feature flags and return the settings object augmented with
 * feature-flag definitions and their runtime state.
 *
 * @pseudocode
 * 1. Load feature flag definitions and any persisted flag values.
 * 2. Merge flag defaults with persisted values to produce an initialized
 *    `settings.featureFlags` structure.
 * 3. Return a Settings object that includes the feature flags for runtime use.
 *
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>}
 *   Settings including initialized `featureFlags`.
 */
export { initFeatureFlags } from "../featureFlags.js";
