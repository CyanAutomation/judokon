import { buildMenu, setupHamburger, navTooltipKey, BASE_PATH } from "../api/navigation.js";

export { navTooltipKey, BASE_PATH };

/**
 * Toggles the expanded map view for landscape mode.
 *
 * @pseudocode
 * 1. Delegate to {@link buildMenu} with `orientation: "landscape"`.
 * 2. Return the created menu element.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 * @returns {HTMLElement|null} Created menu element or null.
 */
export function toggleExpandedMapView(gameModes) {
  return buildMenu(gameModes, { orientation: "landscape" });
}

/**
 * Toggles the vertical text menu for portrait mode.
 *
 * @pseudocode
 * 1. Delegate to {@link buildMenu} with `orientation: "portrait"`.
 * 2. Return the created menu element.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 * @returns {HTMLElement|null} Created menu element or null.
 */
export function togglePortraitTextMenu(gameModes) {
  return buildMenu(gameModes, { orientation: "portrait" });
}

/**
 * Initialize a hamburger toggle for narrow viewports.
 *
 * @pseudocode
 * 1. Delegate to {@link setupHamburger} with the provided breakpoint.
 * 2. Return the DOM hooks from the API.
 *
 * @param {number} [breakpoint=480] - Maximum width to show the hamburger menu.
 * @returns {{button: HTMLButtonElement|null, list: HTMLUListElement|null}} DOM hooks.
 */
export function setupHamburgerMenu(breakpoint = 480) {
  return setupHamburger(breakpoint);
}
