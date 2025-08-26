/**
 * Centralized constants configuring Ju-Do-Kon! gameplay settings.
 *
 * These values determine where JSON data is loaded from and control
 * how carousels behave, how long UI elements remain visible, and the
 * default limits for Classic Battle matches.
 *
 * @pseudocode
 * 1. Derive the base path to JSON data files with `resolveDataDir`.
 * 2. Define carousel swipe threshold and spinner delay.
 * 3. Set fade and removal durations for settings error popups.
 * 4. Establish Classic Battle win conditions and maximum rounds.
 */
/**
 * Resolves the path to the directory containing JSON data files.
 *
 * Builds a URL relative to the helpers directory and ensures the path includes
 * `/src/` so tests and builds both locate the data directory correctly.
 *
 * @param {string|URL} moduleUrl - URL of the calling module.
 * @returns {string} Absolute URL to the data directory.
 */
export function resolveDataDir(moduleUrl) {
  const normalizedUrl = typeof moduleUrl === "string" ? moduleUrl : moduleUrl.href;
  const dataUrl = new URL("../data/", new URL(".", normalizedUrl));
  if (!dataUrl.pathname.includes("/src/")) {
    dataUrl.pathname = `/src${dataUrl.pathname}`;
  }
  return dataUrl.href;
}

/**
 * Path to the directory containing JSON data files.
 *
 * @constant {string}
 */
export const DATA_DIR = resolveDataDir(import.meta.url);

/**
 * Minimum swipe distance in pixels required to trigger carousel
 * scrolling on touch devices.
 *
 * @constant {number}
 */
export const CAROUSEL_SWIPE_THRESHOLD = 40;

/**
 * Delay in milliseconds before showing the loading spinner in the
 * carousel.
 *
 * @constant {number}
 */
export const SPINNER_DELAY_MS = 2000;

/**
 * Duration in milliseconds before hiding the settings error popup.
 *
 * @constant {number}
 */
export const SETTINGS_FADE_MS = 1800;

/**
 * Duration in milliseconds before removing the settings error popup
 * from the DOM.
 *
 * @constant {number}
 */
export const SETTINGS_REMOVE_MS = 2000;

/**
 * Duration in milliseconds before the snackbar begins fading out.
 *
 * @constant {number}
 */
export const SNACKBAR_FADE_MS = 2500;

/**
 * Duration in milliseconds before removing the snackbar element from the DOM.
 *
 * @constant {number}
 */
export const SNACKBAR_REMOVE_MS = 3000;

/**
 * Maximum points needed to win a Classic Battle match.
 *
 * @constant {number}
 */
export const CLASSIC_BATTLE_POINTS_TO_WIN = 10;

/**
 * Maximum number of rounds allowed in a Classic Battle match.
 *
 * @constant {number}
 */
export const CLASSIC_BATTLE_MAX_ROUNDS = 25;
