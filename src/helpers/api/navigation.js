import { validateGameModes } from "../navigation/navData.js";

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
 * Escape special HTML characters to prevent injection.
 *
 * @pseudocode
 * 1. Convert the input to a string.
 * 2. Replace `&`, `<`, `>`, `"`, and `'` with their HTML entity equivalents.
 *
 * @param {unknown} value - The value to escape.
 * @returns {string} Escaped string safe for HTML insertion.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Base path for navigation links derived from the current module location.
 */
export const BASE_PATH = (() => {
  const url = new URL(import.meta.url);
  url.pathname = url.pathname.replace(/helpers\/api\/navigation.js$/, "pages/");
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
function clearBottomNavbar() {
  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return;
  navBar.innerHTML = "";
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
 * 1. Determine if the current viewport matches the provided orientation when `window` is available; otherwise assume landscape.
 * 2. Select the navbar and logo; exit if either is missing.
 * 3. Validate game modes and build a menu container with orientation class.
 * 4. Populate the container using the appropriate template per mode.
 * 5. Preserve the logo and wire click animations.
 * 6. Return the created menu element.
 *
 * @param {import("../types.js").GameMode[]} gameModes - Modes to display.
 * @param {{orientation: "landscape"|"portrait"}} options - Orientation settings.
 * @returns {HTMLElement|null} Created menu element or null if skipped.
 */
export function buildMenu(gameModes, { orientation }) {
  const matches =
    typeof window !== "undefined"
      ? typeof window.matchMedia === "function"
        ? window.matchMedia(`(orientation: ${orientation})`).matches
        : orientation === "landscape"
          ? window.innerWidth > window.innerHeight
          : window.innerHeight >= window.innerWidth
      : orientation === "landscape";
  if (!matches) return null;

  const navBar = document.querySelector(".bottom-navbar");
  if (!navBar) return null;
  const logo = navBar.querySelector(".logo");
  if (!logo) return null;

  const validModes = validateGameModes(gameModes);

  const menu = document.createElement("div");
  const isLandscape = orientation === "landscape";
  menu.className = isLandscape ? "expanded-map-view" : "portrait-text-menu";
  const template = isLandscape
    ? (mode) =>
        `<a
          href="${BASE_PATH}${escapeHtml(mode.url)}"
          aria-label="${escapeHtml(mode.name)}"
          data-tooltip-id="nav.${navTooltipKey(mode.name)}"
          data-testid="nav-${mode.id}"
          style="order: ${mode.order}"
          class="map-tile${mode.isHidden ? " hidden" : ""}"
        >
          <img src="${escapeHtml(mode.image)}" alt="${escapeHtml(mode.name)}" loading="lazy">
          ${escapeHtml(mode.name)}
        </a>`
    : (mode) =>
        `<a
          href="${BASE_PATH}${escapeHtml(mode.url)}"
          aria-label="${escapeHtml(mode.name)}"
          data-tooltip-id="nav.${navTooltipKey(mode.name)}"
          data-testid="nav-${mode.id}"
          style="order: ${mode.order}"
          class="text-menu-item${mode.isHidden ? " hidden" : ""}"
        >
          ${escapeHtml(mode.name)}
        </a>`;
  menu.innerHTML = validModes.map(template).join("");

  const animations = isLandscape
    ? { show: "slide-up 500ms ease-in-out", hide: "slide-down 500ms ease-in-out" }
    : { show: "slide-down 500ms ease-in-out", hide: "slide-up 500ms ease-in-out" };

  preserveLogoAndWire(navBar, logo, menu, animations);
  return menu;
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
 * 6. Return a cleanup function that removes the `resize` listener.
 *
 * @param {number} [breakpoint=480] - Maximum width to show the hamburger menu.
 * @returns {() => void} Cleanup function to remove the `resize` listener.
 */
export function setupHamburger(breakpoint = 480) {
  const navBar = document.querySelector(".bottom-navbar");
  const list = navBar?.querySelector("ul") || null;
  if (!navBar || !list) return () => {};

  const id = list.id || "bottom-nav-menu";
  list.id = id;

  const button = document.createElement("button");
  button.className = "nav-toggle";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", id);
  button.setAttribute("aria-label", "Menu");
  button.innerHTML = "\u2630";

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

  return () => {
    window.removeEventListener("resize", update);
  };
}
