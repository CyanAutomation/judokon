export const DEBUG_LOGGING =
  (typeof process !== 'undefined' && process.env.DEBUG_LOGGING === 'true') ||
  (typeof window !== 'undefined' && window.DEBUG_LOGGING === true);

export function debugLog(...args) {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
}
