import { validateGameModes } from "./navData.js";

/**
 * Convert a game mode name to a camelCase key for tooltip ids.
 *
 * @pseudocode
 * 1. Replace non-alphanumeric characters with spaces.
 * 2. Split into words.
 * 3. Lowercase the first word and capitalize the rest.
 * 4. Join the words without spaces.
 *
 * @param {string} name - Game mode name.
 * @returns {string} camelCase key.
 */
export function navTooltipKey(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join("");
}

/**
 * Base path for navigation links derived from the current module location.
 */
export const BASE_PATH = (() => {
  const url = new URL("../../pages/", import.meta.url);
  return url.href.endsWith("/") ? url : new URL(url.href + "/");
})();

/**
 * Clears existing content in the bottom navigation bar.
 *
 * @pseudocode
 * 1. Select the `.bottom-navbar` element.
 * 2. Exit early if the element is not found.
 * 3. Remove all child elements to prevent duplication.
 */
export function clearBottomNavbar() {
  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return; // Guard: do nothing if navbar is missing
  navBar.innerHTML = ""; // Clear all existing content
}

/**
 * Toggles the expanded map view for landscape mode.
 *
 * @pseudocode
 * 1. Check if the device is in landscape orientation.
 * 2. Select the `.bottom-navbar` element and exit early if not found.
 * 3. Create a map view with clickable tiles for game modes.
 * 4. Add a slide-up animation when the logo is clicked.
 * 5. Hide the map view when the logo is clicked again.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 */
export function toggleExpandedMapView(gameModes) {
  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return; // Guard: do nothing if navbar is missing
  clearBottomNavbar(); // Clear existing content

  const validModes = validateGameModes(gameModes);

  const mapView = document.createElement("div");
  mapView.className = "expanded-map-view";

  mapView.innerHTML = validModes
    .map(
      (mode) =>
        `<div class="map-tile">
          <img src="${mode.image}" alt="${mode.name}" loading="lazy">
          <a href="${BASE_PATH}${mode.url}" aria-label="${mode.name}" data-tooltip-id="nav.${navTooltipKey(mode.name)}">${mode.name}</a>
        </div>`
    )
    .join("");

  navBar.appendChild(mapView);

  const logo = document.querySelector(".bottom-navbar .logo");
  logo.addEventListener("click", () => {
    mapView.classList.toggle("visible");
    mapView.style.animation = mapView.classList.contains("visible")
      ? "slide-up 500ms ease-in-out"
      : "slide-down 500ms ease-in-out";
  });
}

/**
 * Toggles the vertical text menu for portrait mode.
 *
 * @pseudocode
 * 1. Check if the device is in portrait orientation.
 * 2. Create a vertical menu with game modes as list items.
 * 3. Add a slide-down animation when the logo is clicked.
 * 4. Hide the menu when the logo is clicked again.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 */
export function togglePortraitTextMenu(gameModes) {
  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return; // Guard: do nothing if navbar is missing
  clearBottomNavbar(); // Clear existing content

  const validModes = validateGameModes(gameModes);

  const textMenu = document.createElement("ul");
  textMenu.className = "portrait-text-menu";

  textMenu.innerHTML = validModes
    .map(
      (mode) =>
        `<li><a href="${BASE_PATH}${mode.url}" aria-label="${mode.name}" data-tooltip-id="nav.${navTooltipKey(mode.name)}">${mode.name}</a></li>`
    )
    .join("");

  navBar.appendChild(textMenu);

  const logo = document.querySelector(".bottom-navbar .logo");
  logo.addEventListener("click", () => {
    textMenu.classList.toggle("visible");
    textMenu.style.animation = textMenu.classList.contains("visible")
      ? "slide-down 500ms ease-in-out"
      : "slide-up 500ms ease-in-out";
  });
}
