import { applyDisplayMode, normalizeDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";

/**
 * @summary Sync the selected display mode with persisted settings.
 * @pseudocode
 * 1. Locate the checked `display-mode` radio input.
 * 2. Normalize `current.displayMode` and, if the normalized value differs, persist the normalized value.
 * 3. If the selected radio differs from the normalized value, apply and persist the radio value.
 * 4. Return the updated settings object.
 *
 * @param {Settings} current - Current settings object.
 * @param {(key: string, value: string, onError: Function) => Promise<void>} handleUpdate
 *   Persist helper for settings.
 * @returns {Settings} Updated settings.
 */
export function syncDisplayMode(current, handleUpdate) {
  const radio = document.querySelector('input[name="display-mode"]:checked');
  const currentMode = normalizeDisplayMode(current.displayMode);
  if (!radio || radio.value === currentMode) {
    if (currentMode && currentMode !== current.displayMode) {
      handleUpdate("displayMode", currentMode, () => {}).catch(() => {});
      return { ...current, displayMode: currentMode };
    }
    return current;
  }
  withViewTransition(() => applyDisplayMode(radio.value));
  handleUpdate("displayMode", radio.value, () => {}).catch(() => {});
  return { ...current, displayMode: radio.value };
}
