/**
 * Centralized constants configuring Ju-Do-Kon! gameplay settings.
 *
 * These values determine where JSON data is loaded from and control
 * how carousels behave, how long UI elements remain visible, and the
 * default limits for Classic Battle matches.
 *
 * @pseudocode
 * 1. Provide the base path to JSON data files.
 * 2. Define carousel scroll distance, swipe threshold, and spinner delay.
 * 3. Set fade and removal durations for settings error popups.
 * 4. Establish Classic Battle win conditions and maximum rounds.
 */

/**
 * Path to the directory containing JSON data files.
 *
 * Using `import.meta.url` ensures the correct absolute URL is
 * generated regardless of which page imports this module. This
 * prevents broken relative paths when pages are nested within the
 * project directory structure.
 *
 * @constant {string}
 */
export const DATA_DIR = new URL("../data/", import.meta.url).href;

/**
 * Distance in pixels that the carousel scrolls when using keyboard
 * navigation or scroll buttons.
 *
 * @constant {number}
 */
export const CAROUSEL_SCROLL_DISTANCE = 300;

/**
 * Minimum swipe distance in pixels required to trigger carousel
 * scrolling on touch devices.
 *
 * @constant {number}
 */
export const CAROUSEL_SWIPE_THRESHOLD = 50;

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
