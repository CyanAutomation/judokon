/**
 * Centralized constants configuring Ju-Do-Kon! gameplay settings.
 *
 * These values determine where JSON data is loaded from and control
 * how carousels behave, how long UI elements remain visible, and the
 * default limits for Classic Battle matches.
 *
 * @pseudocode
 * 1. Normalize `import.meta.url`, resolve the helpers directory URL, and derive the base path to JSON data files.
 * 2. Define carousel swipe threshold and spinner delay.
 * 3. Set fade and removal durations for settings error popups.
 * 4. Establish Classic Battle win conditions and maximum rounds.
 */

/**
 * Absolute URL to the helpers directory.
 *
 * The `@vite-ignore` directive is used here to prevent Vite from analyzing
 * or transforming the path as a static asset import. Without this directive,
 * Vite may attempt to bundle or process the directory, which is not desired
 * for runtime directory resolution.
 *
 * @constant {URL}
 */
// Normalize the module URL to avoid issues in non-browser environments.
const moduleUrl = typeof import.meta.url === "string" ? import.meta.url : import.meta.url.href;

const HELPERS_DIR = new URL(/* @vite-ignore */ ".", moduleUrl);

/**
 * Path to the directory containing JSON data files.
 *
 * Resolving the helpers directory separately avoids having Vite
 * analyze the data directory as an asset import.
 *
 * @constant {string}
 */
export const DATA_DIR = new URL("../data/", HELPERS_DIR).href;

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
