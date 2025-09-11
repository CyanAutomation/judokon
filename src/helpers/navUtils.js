/**
 * Build an absolute URL to the app's home page.
 *
 * @pseudocode
 * 1. Read `window.location` to obtain the current origin and pathname.
 * 2. Extract any base path preceding `/src/pages/` or `/pages/`.
 * 3. Ensure the base path ends with a trailing `/`.
 * 4. Return the origin combined with the normalized base and `index.html`.
 * 5. On error, return a relative `../../index.html` fallback.
 *
 * @returns {string} Absolute URL of the home page.
 */
export function resolveHomeHref() {
  try {
    const { origin, pathname } = window.location;
    // Capture everything before "/src/pages/" or "/pages/" to preserve base.
    const match = pathname.match(/^(.*?)(?:\/src\/pages\/|\/pages\/)/);
    const base = match ? match[1] : "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return `${origin}${normalizedBase}index.html`;
  } catch {
    // Safe fallback for non-browser environments
    return "../../index.html";
  }
}

/**
 * Navigates the browser to the application's home page.
 *
 * @summary This function attempts to redirect the user to the main entry point
 * of the application, handling various URL resolution scenarios and providing
 * graceful degradation for unsupported environments.
 *
 * @pseudocode
 * 1. Attempt to directly set `window.location.href` to the URL returned by `resolveHomeHref()`.
 * 2. If the direct assignment fails (e.g., due to security restrictions or non-browser environment):
 *    a. Construct a fully qualified absolute URL for the home page by resolving `resolveHomeHref()` against the current `window.location.href`.
 *    b. If `history.replaceState` is available (indicating a modern browser environment), use it to change the browser's URL without reloading the page.
 *    c. Catch and silently ignore any further errors during this fallback process to ensure the function does not throw.
 *
 * @returns {void}
 */
export function navigateToHome() {
  try {
    window.location.href = resolveHomeHref();
  } catch {
    try {
      const target = new URL(resolveHomeHref(), window.location.href).href;
      if (typeof history !== "undefined" && typeof history.replaceState === "function") {
        history.replaceState(null, "", target);
      }
    } catch {}
  }
}
