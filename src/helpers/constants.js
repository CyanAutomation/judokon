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
 * @summary Builds a URL relative to the helpers directory and ensures the path includes
 * `/src/` so tests and builds both locate the data directory correctly.
 *
 * @pseudocode
 * 1. Normalize the input `moduleUrl` to a string.
 * 2. Search for the `/src/` marker in the normalized URL.
 * 3. If `/src/` is found, extract the root path up to and including `/src/`, then append `data/` to form the data directory URL.
 * 4. If `/src/` is not found but the URL is an `http(s)` URL, construct the data directory URL using the origin and `/src/data/`.
 * 5. As a fallback, resolve the data directory URL relative to the calling module's directory.
 *
 * @param {string|URL} moduleUrl - URL of the calling module (e.g., `import.meta.url`).
 * @returns {string} Absolute URL to the data directory (e.g., `file:///path/to/src/data/` or `https://example.com/src/data/`).
 */
export function resolveDataDir(moduleUrl) {
  const normalizedUrl = typeof moduleUrl === "string" ? moduleUrl : moduleUrl.href;
  // Anchor resolution at the repository's `src/` root, regardless of current subfolder depth.
  // Example inputs → outputs:
  // - file:///.../src/helpers/constants.js → file:///.../src/data/
  // - file:///.../src/helpers/vectorSearch/loader.js → file:///.../src/data/
  const srcMarker = "/src/";
  const idx = normalizedUrl.indexOf(srcMarker);
  if (idx !== -1) {
    const srcRoot = normalizedUrl.slice(0, idx + srcMarker.length); // includes trailing slash
    return new URL("data/", srcRoot).href;
  }
  // When the module URL is an http(s) URL outside `/src/`, prefer the origin + `/src/data/`.
  if (/^https?:\/\//.test(normalizedUrl)) {
    const u = new URL(normalizedUrl);
    return `${u.origin}/src/data/`;
  }
  // Fallback: resolve relative to the calling module's directory
  return new URL("../data/", new URL(".", normalizedUrl)).href;
}

/**
 * Path to the directory containing JSON data files.
 *
 * @summary The value is derived from `import.meta.url` via `resolveDataDir` so tests
 * and runtime code can load JSON assets consistently.
 *
 * @constant {string}
 * @pseudocode
 * 1. The `DATA_DIR` constant is assigned the return value of `resolveDataDir(import.meta.url)`.
 * 2. `resolveDataDir` determines the absolute URL of the `data/` directory relative to the current module's URL.
 * 3. This ensures that data files can be accessed consistently across different environments (e.g., development server, production build, tests).
 */
export const DATA_DIR = resolveDataDir(import.meta.url);

/**
 * Minimum horizontal movement in pixels required to trigger carousel
 * scrolling on touch devices.
 *
 * @summary This constant defines the minimum distance a user's finger must
 * travel horizontally on a touch-enabled device for a swipe gesture to be
 * recognized as a carousel scroll action, rather than a tap or accidental movement.
 *
 * @constant {number}
 * @pseudocode
 * 1. During a touch interaction, calculate the horizontal displacement (`deltaX`) from the touch start to the current touch position.
 * 2. If the absolute value of `deltaX` is greater than or equal to `CAROUSEL_SWIPE_THRESHOLD`, interpret the gesture as a swipe, and initiate carousel scrolling.
 * 3. Otherwise, if the threshold is not met, the gesture is considered a tap or a minor movement, and the carousel's position remains unchanged.
 */
export const CAROUSEL_SWIPE_THRESHOLD = 40;

/**
 * Delay in milliseconds before showing the loading spinner in the
 * carousel.
 *
 * @summary This constant defines how long the system waits before displaying
 * a loading spinner. This prevents a brief flicker of the spinner for very
 * fast operations, improving perceived performance.
 *
 * @constant {number}
 * @pseudocode
 * 1. When a loading operation begins, start a timer with a duration of `SPINNER_DELAY_MS`.
 * 2. If the loading operation completes before the timer expires, the spinner is never shown.
 * 3. If the timer expires before the loading operation completes, display the loading spinner.
 */
export const SPINNER_DELAY_MS = 2000;

/**
 * Duration in milliseconds before the settings error popup begins to fade out.
 *
 * @summary This constant controls the visual duration of a settings-related
 * error message before it starts its fade-out animation.
 *
 * @constant {number}
 * @pseudocode
 * 1. When a settings error popup is displayed, a timer is started.
 * 2. After `SETTINGS_FADE_MS` milliseconds, the popup's opacity begins to decrease, initiating its fade-out effect.
 */
export const SETTINGS_FADE_MS = 1800;

/**
 * Duration in milliseconds before removing the settings error popup
 * from the DOM.
 *
 * @summary This constant specifies the total time, from display to complete
 * removal, for a settings-related error message. It includes any fade-out
 * animation duration.
 *
 * @constant {number}
 * @pseudocode
 * 1. After a settings error popup is displayed, a timer is set for `SETTINGS_REMOVE_MS`.
 * 2. Upon timer expiration, the popup element is completely removed from the Document Object Model (DOM).
 */
export const SETTINGS_REMOVE_MS = 2000;

/**
 * Duration in milliseconds before the snackbar begins fading out.
 *
 * @summary This constant determines how long a snackbar message remains fully
 * visible before its fade-out animation starts.
 *
 * @constant {number}
 * @pseudocode
 * 1. When a snackbar is displayed, a timer is initiated.
 * 2. After `SNACKBAR_FADE_MS` milliseconds, the snackbar's opacity will start to decrease, making it gradually disappear.
 */
export const SNACKBAR_FADE_MS = 2500;

/**
 * Duration in milliseconds before removing the snackbar element from the DOM.
 *
 * @summary This constant defines the total lifecycle duration of a snackbar
 * message, from its appearance to its complete removal from the document.
 * This includes any fade-out animation time.
 *
 * @constant {number}
 * @pseudocode
 * 1. After a snackbar is displayed, a timer is set for `SNACKBAR_REMOVE_MS`.
 * 2. When this timer expires, the snackbar element is completely detached from the DOM.
 */
export const SNACKBAR_REMOVE_MS = 3000;

/**
 * Maximum points needed to win a Classic Battle match.
 *
 * @summary This constant defines the score a player must achieve to win a
 * Classic Battle match. The first player to reach or exceed this score wins.
 *
 * @constant {number}
 * @pseudocode
 * 1. During a Classic Battle match, track the scores of both the player and the opponent.
 * 2. After each round, compare the current scores against `CLASSIC_BATTLE_POINTS_TO_WIN`.
 * 3. If either player's score is equal to or greater than this value, the match ends, and that player is declared the winner.
 */
export const CLASSIC_BATTLE_POINTS_TO_WIN = 10;

/**
 * Maximum number of rounds allowed in a Classic Battle match.
 *
 * @summary This constant sets an upper limit on the number of rounds that can
 * be played in a Classic Battle match. If neither player reaches the
 * `CLASSIC_BATTLE_POINTS_TO_WIN` score by this round, the match may end
 * in a draw or be decided by other criteria.
 *
 * @constant {number}
 * @pseudocode
 * 1. During a Classic Battle match, increment a round counter after each completed round.
 * 2. Before starting a new round, check if the round counter has reached `CLASSIC_BATTLE_MAX_ROUNDS`.
 * 3. If the maximum number of rounds is reached and no winner has been determined by points, 
 *    the match concludes based on predefined tie-breaking rules or is declared a draw.
 */
export const CLASSIC_BATTLE_MAX_ROUNDS = 25;
