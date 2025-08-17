/**
 * Create a settings update handler.
 *
 * @pseudocode
 * 1. Call `updateSetting` with the provided key/value.
 * 2. On success, store the returned settings via `setCurrentSettings`.
 * 3. On failure, log an error, invoke `showErrorAndRevert` with `revert`, and rethrow.
 *
 * @param {(settings: object) => void} setCurrentSettings - Stores updated settings.
 * @param {(revert?: Function) => void} showErrorAndRevert - Displays an error and reverts UI state.
 * @returns {(key: string, value: any, revert?: Function) => Promise<void>} Persist helper.
 */
import { updateSetting } from "../settingsStorage.js";

export function makeHandleUpdate(setCurrentSettings, showErrorAndRevert) {
  return function handleUpdate(key, value, revert) {
    return updateSetting(key, value)
      .then((updated) => {
        setCurrentSettings(updated);
        return updated;
      })
      .catch((err) => {
        console.error("Failed to update setting", err);
        showErrorAndRevert(revert);
        throw err;
      });
  };
}
