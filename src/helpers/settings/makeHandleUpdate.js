/**
 * Create a settings update handler.
 *
 * @pseudocode
 * 1. Load the latest settings and persist the updated value.
 * 2. On success, store the returned settings via `setCurrentSettings`.
 * 3. On failure, log an error, invoke `showErrorAndRevert` with `revert`, and rethrow.
 *
 * @param {(settings: object) => void} setCurrentSettings - Stores updated settings.
 * @param {(revert?: Function) => void} showErrorAndRevert - Displays an error and reverts UI state.
 * @returns {(key: string, value: any, revert?: Function) => Promise<void>} Persist helper.
 */
import { loadSettings, saveSettings } from "../settingsStorage.js";
import { DEFAULT_SETTINGS } from "../../config/settingsDefaults.js";

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Build a handler that persists a single setting and updates in-memory state.
 *
 * Contract:
 * - Inputs: (key: string, value: any, revert?: Function)
 * - Outputs: Promise resolving to the updated settings object.
 * - Error mode: call `showErrorAndRevert(revert)` and rethrow the error.
 *
 * @pseudocode
 * 1. Load current settings, update `key`/`value`, and persist the change.
 * 2. On success, call `setCurrentSettings(updated)` to keep in-memory state in sync.
 * 3. On failure, log the error, call `showErrorAndRevert(revert)` to restore UI,
 *    then rethrow the error so callers can react.
 *
 * @param {(settings: object) => void} setCurrentSettings - Setter for runtime settings.
 * @param {(revert?: Function) => void} showErrorAndRevert - UI error handler that also reverts UI.
 * @returns {(key: string, value: any, revert?: Function) => Promise<object>} handleUpdate
 */
export function makeHandleUpdate(setCurrentSettings, showErrorAndRevert, onUpdate) {
  let updateQueue = Promise.resolve();

  return function handleUpdate(key, value, revert, controlElement) {
    const queuedUpdate = updateQueue.then(async () => {
      try {
        const settings = await loadSettings();
        const current = settings ?? DEFAULT_SETTINGS;
        const updated = { ...current, [key]: value };
        await saveSettings(updated);
        setCurrentSettings(updated);
        if (typeof onUpdate === "function") {
          onUpdate(controlElement);
        }
        return updated;
      } catch (err) {
        console.error("Failed to update setting", err);
        showErrorAndRevert(revert);
        throw err;
      }
    });

    updateQueue = queuedUpdate.catch(() => {});
    return queuedUpdate;
  };
}
