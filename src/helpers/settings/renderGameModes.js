import { renderGameModeSwitches } from "./gameModeSwitches.js";

/**
 * @summary Render game mode toggle switches.
 * @pseudocode
 * 1. Find the game-mode container element.
 * 2. Remove existing `.settings-item` children.
 * 3. When `gameModes` is an array, delegate to `renderGameModeSwitches`.
 *
 * @param {Array} gameModes - List of game mode definitions.
 * @param {() => Settings} getCurrentSettings - Getter for current settings.
 * @param {Function} handleUpdate - Persist helper for settings.
 * @returns {void}
 */

export function renderGameModes(gameModes, getCurrentSettings, handleUpdate) {
  const container = document.getElementById("game-mode-toggle-container");
  if (!container || !Array.isArray(gameModes)) return;
  container.querySelectorAll(".settings-item").forEach((el) => el.remove());
  renderGameModeSwitches(container, gameModes, getCurrentSettings, handleUpdate);
}
