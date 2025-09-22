/**
 * @file Legacy settings form utilities entry point.
 *
 * @description
 * Maintains backwards compatibility for modules that previously imported
 * from `src/helpers/settingsFormUtils.js` by re-exporting the consolidated
 * utilities from their modular locations.
 */

import { renderGameModeSwitches as baseRenderGameModeSwitches } from "./settings/gameModeSwitches.js";
import { renderFeatureFlagSwitches as baseRenderFeatureFlagSwitches } from "./settings/featureFlagSwitches.js";

/**
 * Legacy alias for {@link baseRenderGameModeSwitches}.
 *
 * @pseudocode
 * 1. Invoke {@link baseRenderGameModeSwitches} with the provided arguments.
 * 2. Return the promise from the underlying implementation.
 *
 * @param {HTMLElement} container - DOM element that will receive toggle controls.
 * @param {Array<Object>} gameModes - Array of game mode definitions.
 * @param {() => Object} getCurrentSettings - Getter for the current settings snapshot.
 * @param {(key: string, value: any, onError?: Function) => Promise} handleUpdate - Persist callback for setting updates.
 * @returns {ReturnType<typeof baseRenderGameModeSwitches>} A promise that resolves when rendering side effects complete.
 */
export function renderGameModeSwitches(container, gameModes, getCurrentSettings, handleUpdate) {
  return baseRenderGameModeSwitches(container, gameModes, getCurrentSettings, handleUpdate);
}

/**
 * Legacy alias for {@link baseRenderFeatureFlagSwitches}.
 *
 * @pseudocode
 * 1. Invoke {@link baseRenderFeatureFlagSwitches} with the provided arguments.
 * 2. Return the promise from the underlying implementation.
 *
 * @param {HTMLElement} container - DOM element that will receive toggle controls.
 * @param {Record<string, { enabled: boolean, tooltipId?: string }>} flags - Map of feature flag definitions.
 * @param {() => Object} getCurrentSettings - Getter for the current settings snapshot.
 * @param {(key: string, value: any, onError?: Function) => Promise} handleUpdate - Persist callback for setting updates.
 * @param {Record<string, string>} [tooltipMap={}] - Optional localized tooltip copy map.
 * @returns {ReturnType<typeof baseRenderFeatureFlagSwitches>} A promise that resolves when rendering side effects complete.
 */
export function renderFeatureFlagSwitches(
  container,
  flags,
  getCurrentSettings,
  handleUpdate,
  tooltipMap = {}
) {
  return baseRenderFeatureFlagSwitches(
    container,
    flags,
    getCurrentSettings,
    handleUpdate,
    tooltipMap
  );
}
