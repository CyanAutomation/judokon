/**
 * Determine if the current runtime should be treated as a development environment.
 *
 * @pseudocode
 * if process.NODE_ENV is "development" return true
 * else if window.__DEV__ is truthy return true
 * else return false
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
