/**
 * @file Legacy settings form utilities entry point.
 *
 * @description
 * Maintains backwards compatibility for modules that previously imported
 * from `src/helpers/settingsFormUtils.js` by re-exporting the consolidated
 * utilities from their modular locations.
 */

/**
 * Legacy alias for {@link import("./settings/gameModeSwitches.js").renderGameModeSwitches}.
 *
 * @pseudocode
 * 1. Import the modular `renderGameModeSwitches` implementation.
 * 2. Re-export it so legacy consumers can continue importing from this module.
 *
 * @param {HTMLElement} container - DOM element that will receive toggle controls.
 * @param {Array<Object>} gameModes - Array of game mode definitions.
 * @param {() => Object} getCurrentSettings - Getter for the current settings snapshot.
 * @param {(key: string, value: any, onError?: Function) => Promise} handleUpdate - Persist callback for setting updates.
 * @returns {void}
 */
export { renderGameModeSwitches } from "./settings/gameModeSwitches.js";

/**
 * Legacy alias for {@link import("./settings/featureFlagSwitches.js").renderFeatureFlagSwitches}.
 *
 * @pseudocode
 * 1. Import the modular `renderFeatureFlagSwitches` implementation.
 * 2. Re-export it so legacy consumers can continue importing from this module.
 *
 * @param {HTMLElement} container - DOM element that will receive toggle controls.
 * @param {Record<string, { enabled: boolean, tooltipId?: string }>} flags - Map of feature flag definitions.
 * @param {() => Object} getCurrentSettings - Getter for the current settings snapshot.
 * @param {(key: string, value: any, onError?: Function) => Promise} handleUpdate - Persist callback for setting updates.
 * @param {Record<string, string>} [tooltipMap={}] - Optional localized tooltip copy map.
 * @returns {void}
 */
export { renderFeatureFlagSwitches } from "./settings/featureFlagSwitches.js";
