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
 * Preserve the logo and attach toggle behavior for a menu.
 *
 * @pseudocode
 * 1. Clear the existing navbar content.
 * 2. Reinsert the logo into the navbar.
 * 3. Append the provided menu element.
 * 4. Toggle visibility and animation on logo click.
 *
 * @param {HTMLElement} navBar - The bottom navigation bar element.
 * @param {HTMLElement} logo - The logo element to preserve.
 * @param {HTMLElement} menu - The menu element to toggle.
 * @param {{show: string, hide: string}} animations - CSS animations for show/hide.
 */
function preserveLogoAndWire(navBar, logo, menu, animations) {
  clearBottomNavbar();
  navBar.appendChild(logo);
  navBar.appendChild(menu);
  logo.addEventListener("click", () => {
    menu.classList.toggle("visible");
    menu.style.animation = menu.classList.contains("visible") ? animations.show : animations.hide;
  });
}

/**
 * Build a navigation menu for a given orientation.
 *
 * @pseudocode
 * 1. Exit early if the current orientation does not match.
 * 2. Select the `.bottom-navbar` and `.logo`; exit if either is missing.
 * 3. Validate game modes and create a menu container with orientation class.
 * 4. Populate the container using the provided template for each mode.
 * 5. Preserve the logo and wire click animations based on orientation.
 *
 * @param {object} options - Menu build options.
 * @param {import("../types.js").GameMode[]} options.gameModes - Modes to display.
 * @param {"landscape"|"portrait"} options.orientation - Required device orientation.
 * @param {(mode: import("../types.js").GameMode) => string} options.template - HTML template per mode.
 */
export function buildNavMenu({ gameModes, orientation, template }) {
  const matches =
    typeof window.matchMedia === "function"
      ? window.matchMedia(`(orientation: ${orientation})`).matches
      : orientation === "landscape"
        ? window.innerWidth > window.innerHeight
        : window.innerHeight >= window.innerWidth;
  if (!matches) return;

  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return;
  const logo = navBar.querySelector(".logo");
  if (!logo) return;

  const validModes = validateGameModes(gameModes);

  const menu = document.createElement("div");
  menu.className = orientation === "landscape" ? "expanded-map-view" : "portrait-text-menu";
  menu.innerHTML = validModes.map(template).join("");

  const animations =
    orientation === "landscape"
      ? { show: "slide-up 500ms ease-in-out", hide: "slide-down 500ms ease-in-out" }
      : { show: "slide-down 500ms ease-in-out", hide: "slide-up 500ms ease-in-out" };

  preserveLogoAndWire(navBar, logo, menu, animations);
}

/**
 * Toggles the expanded map view for landscape mode.
 *
 * @pseudocode
 * 1. Call {@link buildNavMenu} with landscape checks and tile template.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 */
export function toggleExpandedMapView(gameModes) {
  buildNavMenu({
    gameModes,
    orientation: "landscape",
    template: (mode) =>
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
  });
}

/**
 * Toggles the vertical text menu for portrait mode.
 *
 * @pseudocode
 * 1. Call {@link buildNavMenu} with portrait checks and text template.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to display.
 */
export function togglePortraitTextMenu(gameModes) {
  buildNavMenu({
    gameModes,
    orientation: "portrait",
    template: (mode) =>
      `<a
          href="${BASE_PATH}${mode.url}"
          aria-label="${mode.name}"
          data-tooltip-id="nav.${navTooltipKey(mode.name)}"
          data-testid="nav-${mode.id}"
          style="order: ${mode.order}"
          class="text-menu-item${mode.isHidden ? " hidden" : ""}"
        >
          ${mode.name}
        </a>`
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
