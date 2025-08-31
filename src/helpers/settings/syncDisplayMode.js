import { applyDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";

/**
 * @summary Sync the selected display mode with persisted settings.
 * @pseudocode
 * 1. Locate the checked `display-mode` radio input.
 * 2. If it differs from `current.displayMode`, apply and persist the value.
 * 3. Return the updated settings object.
 *
 * @param {Settings} current - Current settings object.
 * @param {(key: string, value: string, onError: Function) => Promise<void>} handleUpdate
 *   Persist helper for settings.
 * @returns {Settings} Updated settings.
 */
export function syncDisplayMode(current, handleUpdate) {
  const radio = document.querySelector('input[name="display-mode"]:checked');
  if (!radio || radio.value === current.displayMode) return current;
  withViewTransition(() => applyDisplayMode(radio.value));
  handleUpdate("displayMode", radio.value, () => {}).catch(() => {});
  return { ...current, displayMode: radio.value };
}
