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
 * Navigate to the resolved home URL.
 *
 * @pseudocode
 * 1. Attempt to assign `window.location.href` to the home URL.
 * 2. If that fails, build an absolute URL relative to the current location.
 * 3. When `history.replaceState` is available, use it to change the address.
 * 4. Swallow any remaining errors silently.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
