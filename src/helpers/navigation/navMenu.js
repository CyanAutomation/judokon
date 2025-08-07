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
  const url = new URL(import.meta.url);
  url.pathname = url.pathname.replace(/helpers\/navigation\/navMenu.js$/, "pages/");
  return url;
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
 * 1. Exit early if the device is not in landscape orientation.
 * 2. Select the `.bottom-navbar` element and ensure it contains a `.logo`; exit early if either is missing.
 * 3. Create a map view with anchor tiles for game modes, applying test ids, order, and hidden class.
 * 4. Add a slide-up animation when the logo is clicked.
 * 5. Hide the map view when the logo is clicked again.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 */
export function toggleExpandedMapView(gameModes) {
  const isLandscape =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(orientation: landscape)").matches
      : window.innerWidth > window.innerHeight;
  if (!isLandscape) return; // Guard: only apply in landscape mode

  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return; // Guard: do nothing if navbar is missing
  const logo = navBar.querySelector(".logo");
  if (!logo) return; // Guard: do nothing if logo is missing
  clearBottomNavbar(); // Clear existing content
  navBar.appendChild(logo); // Preserve logo for toggle

  const validModes = validateGameModes(gameModes);

  const mapView = document.createElement("div");
  mapView.className = "expanded-map-view";

  mapView.innerHTML = validModes
    .map(
      (mode) =>
        `<a
          href="${BASE_PATH}${mode.url}"
          aria-label="${mode.name}"
          data-tooltip-id="nav.${navTooltipKey(mode.name)}"
          data-testid="nav-${mode.id}"
          style="order: ${mode.order}"
          class="map-tile${mode.isHidden ? " hidden" : ""}"
        >
          <img src="${mode.image}" alt="${mode.name}" loading="lazy">
          ${mode.name}
        </a>`
    )
    .join("");

  navBar.appendChild(mapView);

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
 * 1. Exit early if the device is not in portrait orientation.
 * 2. Select the `.bottom-navbar` element and ensure it contains a `.logo`; exit early if either is missing.
 * 3. Create a vertical menu with anchor items ordered and optionally hidden.
 * 4. Add a slide-down animation when the logo is clicked.
 * 5. Hide the menu when the logo is clicked again.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 */
export function togglePortraitTextMenu(gameModes) {
  const isPortrait =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(orientation: portrait)").matches
      : window.innerHeight >= window.innerWidth;
  if (!isPortrait) return; // Guard: only apply in portrait mode

  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return; // Guard: do nothing if navbar is missing
  const logo = navBar.querySelector(".logo");
  if (!logo) return; // Guard: do nothing if logo is missing
  clearBottomNavbar(); // Clear existing content
  navBar.appendChild(logo); // Preserve logo for toggle

  const validModes = validateGameModes(gameModes);

  const textMenu = document.createElement("div");
  textMenu.className = "portrait-text-menu";

  textMenu.innerHTML = validModes
    .map(
      (mode) =>
        `<a
          href="${BASE_PATH}${mode.url}"
          aria-label="${mode.name}"
          data-tooltip-id="nav.${navTooltipKey(mode.name)}"
          data-testid="nav-${mode.id}"
          style="order: ${mode.order}"
          class="${mode.isHidden ? "hidden" : ""}"
        >
          ${mode.name}
        </a>`
    )
    .join("");

  navBar.appendChild(textMenu);

  logo.addEventListener("click", () => {
    textMenu.classList.toggle("visible");
    textMenu.style.animation = textMenu.classList.contains("visible")
      ? "slide-down 500ms ease-in-out"
      : "slide-up 500ms ease-in-out";
  });
}

/**
 * Initialize a hamburger toggle for narrow viewports.
 *
 * @pseudocode
 * 1. Select the `.bottom-navbar` and its `<ul>`; exit if either is missing.
 * 2. Create a button with `aria-expanded="false"` linked to the list via `aria-controls`.
 * 3. Define `update()` to insert the button and hide the list when the width is below the breakpoint; otherwise remove the button.
 * 4. Define `toggle()` to flip `aria-expanded` and the `.expanded` class on the list.
 * 5. Attach `click` and `resize` listeners and invoke `update()` once.
 *
 * @param {number} [breakpoint=480] - Maximum width to show the hamburger menu.
 */
export function setupHamburgerMenu(breakpoint = 480) {
  const navBar = document.querySelector(".bottom-navbar");
  const list = navBar?.querySelector("ul");
  if (!navBar || !list) return;

  const id = list.id || "bottom-nav-menu";
  list.id = id;

  const button = document.createElement("button");
  button.className = "nav-toggle";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", id);
  button.setAttribute("aria-label", "Menu");
  button.innerHTML = "\u2630"; // ☰

  const toggle = () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    list.classList.toggle("expanded", !expanded);
  };

  button.addEventListener("click", toggle);

  const update = () => {
    if (window.innerWidth < breakpoint) {
      if (!navBar.contains(button)) {
        navBar.insertBefore(button, list);
      }
      button.setAttribute("aria-expanded", "false");
      list.classList.remove("expanded");
    } else if (navBar.contains(button)) {
      button.remove();
      list.classList.remove("expanded");
      button.setAttribute("aria-expanded", "false");
    }
  };

  window.addEventListener("resize", update);
  update();
}
