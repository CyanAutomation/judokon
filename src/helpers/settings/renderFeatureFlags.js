import { renderFeatureFlagSwitches } from "./featureFlagSwitches.js";
import { syncFeatureFlags } from "./syncFeatureFlags.js";

/**
 * @summary Render feature flag toggle switches.
 * @pseudocode
 * 1. Locate the feature-flags container element.
 * 2. Remove existing `.settings-item` children.
 * 3. Sync feature flags via `syncFeatureFlags`.
 * 4. Delegate rendering to `renderFeatureFlagSwitches`.
 *
 * @param {Settings} current - Current settings object.
 * @param {() => Settings} getCurrentSettings - Getter for current settings.
 * @param {Function} handleUpdate - Persist helper for settings.
 * @param {object} tooltipMap - Mapping of tooltip text.
 * @returns {void}
 */

export function renderFeatureFlags(current, getCurrentSettings, handleUpdate, tooltipMap) {
  const container = document.getElementById("feature-flags-container");
  if (!container) return;
  container.querySelectorAll(".settings-item").forEach((el) => el.remove());
  const flags = syncFeatureFlags(current);
  renderFeatureFlagSwitches(container, flags, getCurrentSettings, handleUpdate, tooltipMap);
}
