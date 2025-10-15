/**
 * Determine if the current runtime should be treated as a development environment.
 *
 * @returns {boolean} True when server or client flags indicate development mode.
 * @pseudocode
 * 1. When `process.env.NODE_ENV` equals "development", return true.
 * 2. Otherwise, if `window.__DEV__` is truthy, return true.
 * 3. In all other cases, return false.
 */
export function isDevelopmentEnvironment() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    return true;
  }

  if (typeof window !== "undefined" && window.__DEV__) {
    return true;
  }

  return false;
}
