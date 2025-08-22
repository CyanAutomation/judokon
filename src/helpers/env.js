/**
 * Determine if the code is running in a Node environment.
 *
 * @pseudocode
 * 1. Check that `process.versions.node` exists and `typeof window === "undefined"`.
 * 2. Return `true` when both conditions hold; otherwise, return `false`.
 *
 * @returns {boolean} `true` if running under Node.
 */
export function isNodeEnvironment() {
  return Boolean(
    typeof process !== "undefined" && process?.versions?.node && typeof window === "undefined"
  );
}

/**
 * Check whether a browser `window` object is available.
 *
 * @pseudocode
 * 1. Return `true` when `typeof window !== "undefined"`.
 * 2. Otherwise return `false`.
 *
 * @returns {boolean} `true` when a browser `window` exists.
 */
export function isBrowserEnvironment() {
  return typeof window !== "undefined";
}

/**
 * Derive a base URL for resolving relative paths in the browser.
 *
 * @pseudocode
 * 1. When `document.baseURI` is available, return it.
 * 2. Otherwise use `window.location.href` when defined.
 * 3. Fallback to `window.location.origin`.
 * 4. If none are available, return `"http://localhost"`.
 *
 * @returns {string} Base URL string.
 */
export function getBaseUrl() {
  if (typeof document !== "undefined" && document.baseURI) {
    return document.baseURI;
  }
  if (typeof window !== "undefined") {
    return window.location?.href || window.location?.origin || "http://localhost";
  }
  return "http://localhost";
}
